import React, {useState, useMemo} from 'react';
import {use} from 'use-minimal-state';
import EnterRoom from './EnterRoom';
import RoomHeader from './RoomHeader';
import useWakeLock from '../lib/use-wake-lock';
import {AudienceAvatar, StageAvatar} from './Avatar';
import {useMqParser} from '../lib/tailwind-mqp';
import {useWidth} from '../lib/tailwind-mqp';
import Navigation from './Navigation';
import {userAgent} from '../lib/user-agent';
import {colors, isDark} from '../lib/theme.js';
import {usePushToTalk, useCtrlCombos} from '../lib/hotkeys';
import {useJam} from '../jam-core-react';

const inWebView =
  userAgent.browser?.name !== 'JamWebView' &&
  (userAgent.browser?.name === 'Chrome WebView' ||
    (userAgent.os?.name === 'iOS' &&
      userAgent.browser?.name !== 'Mobile Safari'));

export default function Room({room, roomId, uxConfig}) {
  // room = {name, description, moderators: [peerId], speakers: [peerId], access}
  const [state] = useJam();
  useWakeLock();
  usePushToTalk();
  useCtrlCombos();

  let [
    reactions,
    handRaised,
    identities,
    speaking,
    iSpeak,
    iModerate,
    iMayEnter,
    myIdentity,
    inRoom,
    peers,
    peerState,
    myPeerState,
    hasMicFailed,
  ] = use(state, [
    'reactions',
    'handRaised',
    'identities',
    'speaking',
    'iAmSpeaker',
    'iAmModerator',
    'iAmAuthorized',
    'myIdentity',
    'inRoom',
    'peers',
    'peerState',
    'myPeerState',
    'hasMicFailed',
  ]);

  let myInfo = myIdentity.info;
  let hasEnteredRoom = inRoom === roomId;

  let [editRole, setEditRole] = useState(null);
  let [editSelf, setEditSelf] = useState(false);
  const [audience, setAudience] = useState(state.peers.length);
  const [showLinks, setShowLinks] = useState(false);

  useMemo(() => setAudience(state.peers.length), [state.peers]);

  let {
    name,
    description,
    schedule,
    logoURI,
    roomLinks,
    speakers,
    moderators,
    closed,
    stageOnly,
    shareUrl,
  } = room || {};

  if (!iMayEnter) {
    return <EnterRoom roomId={roomId} name={name} forbidden={true} />;
  }

  if (!iModerate && closed) {
    return (
      <EnterRoom
        roomId={roomId}
        name={name}
        description={description}
        schedule={schedule}
        closed={closed}
      />
    );
  }

  if (!hasEnteredRoom) {
    return (
      <EnterRoom
        roomId={roomId}
        name={name}
        description={description}
        schedule={schedule}
      />
    );
  }

  let myPeerId = myInfo.id;
  let stagePeers = stageOnly
    ? peers
    : (speakers ?? []).filter(id => peers.includes(id));
  let audiencePeers = stageOnly
    ? []
    : peers.filter(id => !stagePeers.includes(id));

  let {noLeave} = uxConfig;

  const colorTheme = state.room?.color ?? 'default';
  const roomColor = colors(colorTheme);
  const textColor = isDark(roomColor.avatarBg) ? roomColor.text.light : roomColor.text.dark;

  return (
    <div className="h-screen w-screen flex flex-col justify-between">
      <div>
        <RoomHeader
          colors={roomColor}
          {...{
            name,
            description,
            logoURI,
            roomLinks,
            showLinks,
            setShowLinks,
            audience,
            closed,
          }}
        />
      </div>

      <div
        className="h-full my-5 overflow-y-scroll"
        // className={mqp('flex flex-col justify-between pt-2 md:pt-10 md:p-10')}
      >
        <div
          className={
            inWebView && !uxConfig.noWebviewWarning
              ? 'rounded bg-blue-50 border border-blue-150 text-gray-600 ml-2 p-3 mb-3 inline text-center'
              : 'hidden'
          }
        >
          <svg
            className="w-5 h-5 inline mr-2 -mt-1"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Open in {userAgent.os?.name === 'iOS' ? 'Safari' : 'Chrome'} for best
          experience.
          <br />
          <a
            className="underline"
            href="https://gitlab.com/jam-systems/jam"
            target="_blank"
            rel="nofollow noreferrer"
          >
            Learn more
          </a>
          .
        </div>

        {/* Main Area */}
        <div className="h-full w-11/12 rounded-lg mx-auto ">
          {/* Stage */}
          <div className="">
            <ol className="flex flex-wrap">
              {iSpeak && (
                <StageAvatar
                  key={myPeerId}
                  peerId={myPeerId}
                  {...{speaking, moderators, reactions, room}}
                  canSpeak={!hasMicFailed}
                  peerState={myPeerState}
                  info={myInfo}
                  handRaised={handRaised}
                />
              )}
              {stagePeers.map(peerId => (
                <StageAvatar
                  key={peerId}
                  {...{speaking, moderators, room}}
                  {...{peerId, peerState, reactions}}
                  canSpeak={true}
                  peerState={peerState[peerId]}
                  info={identities[peerId]}
                  onClick={iModerate ? () => setEditRole(peerId) : undefined}
                  handRaised={handRaised}
                />
              ))}
            </ol>
          </div>

          <hr />
          <p style={{color: textColor}}>
          Audience
          </p>
          {!stageOnly && (
            <>
              <ol className="flex flex-wrap">
                {!iSpeak && (
                  <AudienceAvatar
                    {...{reactions, room}}
                    peerId={myPeerId}
                    peerState={myPeerState}
                    info={myInfo}
                    handRaised={handRaised}
                  />
                )}
                {audiencePeers.map(peerId => (
                  <AudienceAvatar
                    key={peerId}
                    {...{peerId, peerState, reactions, room}}
                    peerState={peerState[peerId]}
                    info={identities[peerId]}
                    handRaised={iModerate && peerState[peerId]?.handRaised}
                    onClick={iModerate ? () => setEditRole(peerId) : undefined}
                  />
                ))}
              </ol>
            </>
          )}
        </div>
      </div>

      <Navigation
        {...{
          room,
          editRole,
          setEditRole,
          editSelf,
          setEditSelf,
        }}
      />
    </div>
  );
}
