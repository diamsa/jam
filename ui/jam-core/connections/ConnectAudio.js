import {} from 'mediasoup-client';
import {addLocalStream} from '../../lib/swarm';
import {use, useRootState} from '../../lib/state-tree';

export default function ConnectAudio({swarm}) {
  let sendingStream = null;

  return function ConnectAudio({roomId, shouldSend, shouldReceive}) {
    let localStream = useRootState('myAudio');
    let remoteStreams = use(swarm, 'remoteStreams');

    shouldSend = localStream && shouldSend;

    if (sendingStream !== localStream && shouldSend) {
      sendingStream = localStream;
      addLocalStream(swarm, localStream, 'audio');
    } else if (sendingStream && !shouldSend) {
      sendingStream = null;
      addLocalStream(swarm, null, 'audio');
    }

    return remoteStreams;
  };
}
