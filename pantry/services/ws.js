const WebSocket = require('ws');
const querystring = require('querystring');
const {get, set, del} = require('../services/redis');
const {ssrVerifyToken} = require('../ssr');

module.exports = {
  addWebsocket,
  activeUserCount,
  activeUsersInRoom,
  broadcast,
  sendRequest,
  sendDirect,
};

// pub sub websocket

const REQUEST_TIMEOUT = 20000;
const reservedTopics = ['server', 'peers', 'add-peer', 'remove-peer'];

function broadcast(roomId, topic, message) {
  publish(roomId, 'server', {t: 'server', d: {t: topic, d: message}});
}

async function sendDirect(roomId, peerId, topic, message) {
  let connection = getConnections(roomId).find(c => c.peerId === peerId);
  if (connection === undefined) throw Error('Peer is not connected');
  sendMessage(connection, {t: 'server', d: {t: topic, d: message}});
}

async function sendRequest(roomId, peerId, topic, message) {
  let connection = getConnections(roomId).find(c => c.peerId === peerId);
  if (connection === undefined) throw Error('Peer is not connected');
  let {id, promise} = newRequest();
  sendMessage(connection, {t: 'server', d: {t: topic, d: message}, r: id});
  return promise;
}

// allows forward-server to create an equivalent sendDirect / sendRequest interface
function handleMessageFromServer(serverConnection, msg) {
  let {t: topic, d: data, r: requestId, ro: roomId, p: receiverId} = msg;
  let connection = getConnections(roomId).find(c => c.peerId === receiverId);
  if (connection === undefined) {
    console.error(
      "Peer is not connected, can't forward message to him",
      roomId,
      receiverId
    );
    return;
  }
  if (topic === 'response') {
    sendMessage(connection, {t: 'response', d: data, r: requestId});
  } else if (requestId === undefined) {
    sendMessage(connection, {t: 'server', d: {t: topic, d: data}});
  } else {
    newForwardRequest(serverConnection, requestId);
    sendMessage(connection, {
      t: 'server',
      d: {t: topic, d: data},
      r: requestId,
    });
  }
}

async function handleMessage(connection, roomId, msg) {
  // TODO: allow unsubscribe
  let {s: subscribeTopics, t: topic, d: data} = msg;
  let senderId = connection.peerId;
  if (subscribeTopics !== undefined) {
    subscribe(connection, roomId, subscribeTopics);
  }

  if (topic === undefined || reservedTopics.includes(topic)) return;

  switch (topic) {
    // special topics (not subscribable)
    // messages to server
    case 'response': {
      let {r: requestId} = msg;
      requestAccepted(requestId, data);
      break;
    }
    case 'mediasoup': {
      let {r: requestId} = msg;
      forwardMessage(topic, {
        t: topic,
        d: data,
        ro: roomId,
        r: requestId,
        p: senderId,
      });
      break;
    }
    // messages where sender decides who gets it
    case 'direct': {
      // send to one specific peer
      let {p: receiverId} = msg;
      let receiver = getConnections(roomId).find(c => c.peerId === receiverId);
      if (receiver !== undefined) {
        sendMessage(receiver, {t: 'direct', d: data, p: senderId});
      }
      break;
    }
    case 'moderator': {
      // send to all mods
      let outgoingMsg = {t: 'direct', d: data, p: senderId};
      let {moderators = []} = (await get('rooms/' + roomId)) ?? {};
      for (let receiver of getConnections(roomId)) {
        if (moderators.includes(getPublicKey(receiver))) {
          sendMessage(receiver, outgoingMsg);
        }
      }
      break;
    }
    default:
      // normal topic that everyone can subscribe
      publish(roomId, topic, {t: topic, d: data, p: senderId});
  }
}

const PING_CHECK_INTERVAL = 5000;
const PING_MAX_INTERVAL = 25000;

function handleConnection(ws, req) {
  let {roomId, peerId, subs} = req;
  if (roomId === '~forward') {
    handleForwardingConnection(ws, req);
    return;
  }
  console.log('ws open', roomId, peerId, subs);
  let lastPing = Date.now();
  let interval = setInterval(() => {
    let timeSincePing = Date.now() - lastPing;
    if (timeSincePing > PING_MAX_INTERVAL) {
      console.log(`killing ws after ${timeSincePing}ms`, roomId, peerId);
      ws.close();
      closeWs();
    }
  }, PING_CHECK_INTERVAL);

  const connection = {ws, peerId};

  addPeer(roomId, connection);

  // inform every participant about new peer connection
  publish(roomId, 'add-peer', {t: 'add-peer', d: peerId});
  publishToServers({t: 'add-peer', d: peerId, ro: roomId});

  // auto subscribe to updates about connected peers
  subscribe(connection, roomId, reservedTopics);
  if (subs !== undefined) subscribe(connection, roomId, subs);

  // inform about peers immediately
  sendMessage(connection, {t: 'peers', d: getPeers(roomId)});

  ws.on('message', jsonMsg => {
    let msg = parseMessage(jsonMsg);
    // console.log('ws message', msg);
    if (msg !== undefined) {
      if (msg.t === 'ping') lastPing = Date.now();
      else handleMessage(connection, roomId, msg);
    }
  });

  ws.on('close', closeWs);

  ws.on('error', error => {
    console.log('ws error', error);
  });

  async function closeWs() {
    clearInterval(interval);
    console.log('ws closed', roomId, peerId);
    removePeer(roomId, connection);
    unsubscribeAll(connection);
    removeKeys(roomId, peerId);

    publish(roomId, 'remove-peer', {t: 'remove-peer', d: peerId});
    publishToServers({t: 'remove-peer', d: peerId, ro: roomId});
  }
}

function handleForwardingConnection(ws, req) {
  let {peerId: serverId, subs: topics} = req;
  console.log('ws start forwarding', serverId, topics);

  const connection = {ws, serverId};

  addForwardServer(connection, topics);

  ws.on('message', jsonMsg => {
    let msg = parseMessage(jsonMsg);
    if (msg !== undefined) handleMessageFromServer(connection, msg);
  });

  ws.on('close', () => {
    removeForwardServer(connection);
  });

  ws.on('error', error => {
    console.log('ws error', error);
  });
}

function activeUserCount() {
  return [...roomConnections.keys()]
    .map(roomId => activeUsersInRoom(roomId).length)
    .reduce((aggregate, current) => aggregate + current, 0);
}
function activeUsersInRoom(roomId) {
  let peersInRoom = getPeers(roomId).map(
    combinedPeerId => combinedPeerId.split('.')[0]
  );
  // make list unique
  return [...new Set(peersInRoom)];
}

// ws server, handles upgrade requests for http server

function addWebsocket(server) {
  const wss = new WebSocket.Server({noServer: true});
  wss.on('connection', handleConnection);

  server.on('upgrade', async (req, socket, head) => {
    let [path, query] = req.url.split('?');
    let [roomId] = path.split('/').filter(t => t);
    let params = querystring.parse(query);
    let {id: peerId, subs, token} = params;

    // this is for forwarding messages to other containers
    // TODO authenticate
    let internal = false;
    if (roomId === '~forward') {
      internal = true;
    }

    let roomInfo = await get('rooms/' + roomId);

    let publicKey = peerId?.split('.')[0];
    if (
      peerId === undefined ||
      ((roomId === undefined || !ssrVerifyToken(token, publicKey)) &&
        !internal) ||
      (roomInfo?.access?.identities &&
        !roomInfo.access.identities.includes(publicKey))
    ) {
      console.log('ws rejected!', req.url, 'room', roomId, 'peer', peerId);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    req.peerId = peerId;
    req.roomId = roomId;
    req.subs = subs?.split(',').filter(t => t) ?? []; // custom encoding, don't use "," in topic names

    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit('connection', ws, req);
    });
  });
}

// connection = {ws, peerId}

function getPublicKey({peerId}) {
  return peerId.split('.')[0];
}

// peer connections per room

const roomConnections = new Map(); // roomId => Set(connection)

function addPeer(roomId, connection) {
  let connections =
    roomConnections.get(roomId) ??
    roomConnections.set(roomId, new Set()).get(roomId);
  connections.add(connection);
  console.log('all peers:', getPeers(roomId));
}
function removePeer(roomId, connection) {
  let connections = roomConnections.get(roomId);
  if (connections !== undefined) {
    connections.delete(connection);
    if (connections.size === 0) roomConnections.delete(roomId);
  }
  console.log('all peers:', getPeers(roomId));
}

async function removeKeys(roomId, userId) {
  const newRoomId = roomId + 'Keys';
  const newUserId = userId.slice(0, -5);
  const roomPeers = getPeers(roomId);
  let roomsKeys = await get(newRoomId);

  if (!roomsKeys) {
    return;
  }
  const hasPrivateKeys = roomsKeys.hasOwnProperty(newUserId);

  if (hasPrivateKeys) {
    delete roomsKeys[`${newUserId}`];

    if (roomPeers.length === 0) {
      del(newRoomId);
      return;
    }

    set(newRoomId, roomsKeys);
  }
}

function getConnections(roomId) {
  let connections = roomConnections.get(roomId);
  if (connections === undefined) return [];
  return [...connections];
}
function getPeers(roomId) {
  let connections = getConnections(roomId);
  let peers = connections.map(c => c.peerId);
  return peers;
}

// p2p pub sub

const subscriptions = new Map(); // "roomId/topic" => Set(connection)

function publish(roomId, topic, msg) {
  let key = `${roomId}/${topic}`;
  let subscribers = subscriptions.get(key);
  if (subscribers === undefined) return;
  for (let subscriber of subscribers) {
    sendMessage(subscriber, msg);
  }
}
function subscribe(connection, roomId, topics) {
  if (!(topics instanceof Array)) topics = [topics];
  for (let topic of topics) {
    let key = `${roomId}/${topic}`;
    let subscribers =
      subscriptions.get(key) ?? subscriptions.set(key, new Set()).get(key);
    subscribers.add(connection);
  }
}
function unsubscribeAll(connection) {
  for (let entry of subscriptions) {
    let [key, subscribers] = entry;
    subscribers.delete(connection);
    if (subscribers.size === 0) subscriptions.delete(key);
  }
}

// server side forwarding

const forwardServers = new Set(); // Set(connection)
const forwardServerTopics = new Map(); // topic => connection

function addForwardServer(connection, topics) {
  forwardServers.add(connection);
  for (let topic of topics) {
    forwardServerTopics.set(topic, connection);
  }
}

function removeForwardServer(connection) {
  forwardServers.delete(connection);
  for (let entry of forwardServerTopics) {
    let [topic, connection_] = entry;
    if (connection_ === connection) {
      forwardServerTopics.delete(topic);
    }
  }
}

function forwardMessage(serverTopic, msg) {
  let connection = forwardServerTopics.get(serverTopic);
  if (connection !== undefined) {
    sendMessage(connection, msg);
  }
}

function publishToServers(msg) {
  for (let connection of forwardServers) {
    sendMessage(connection, msg);
  }
}

// request / response

const serverId = Math.random().toString(32).slice(2, 12);
const requests = new Map();

let nextRequestId = 0;

function newRequest(timeout = REQUEST_TIMEOUT) {
  let requestId = `${serverId};${nextRequestId++}`;
  const request = {id: requestId};
  request.promise = new Promise((resolve, reject) => {
    request.accept = data => {
      clearTimeout(request.timeout);
      resolve(data);
    };
    request.timeout = setTimeout(() => {
      reject(new Error('request timeout'));
    }, timeout);
  });
  requests.set(requestId, request);
  return request;
}

function newForwardRequest(connection, requestId) {
  const request = {
    id: requestId,
    accept(data) {
      sendMessage(connection, {t: 'response', d: data, r: requestId});
    },
  };
  requests.set(requestId, request);
  return request;
}

function requestAccepted(requestId, data) {
  let request = requests.get(requestId);
  if (request === undefined) return;
  request.accept(data);
  requests.delete(requestId);
}

// json

function parseMessage(jsonMsg) {
  try {
    return JSON.parse(jsonMsg);
  } catch (err) {
    console.log('ws: error parsing msg', jsonMsg);
    console.error(err);
  }
}

function sendMessage({ws}, msg) {
  let jsonMsg;
  try {
    jsonMsg = JSON.stringify(msg);
  } catch (err) {
    console.log('ws: error stringifying', msg);
    console.error(err);
    return;
  }
  try {
    ws.send(jsonMsg);
    return true;
  } catch (err) {
    console.log('ws: error sending', jsonMsg);
    console.error(err);
    return false;
  }
}
