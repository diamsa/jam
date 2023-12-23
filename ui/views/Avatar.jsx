import React, {useEffect, useState} from 'react';
import {avatarUrl, displayName} from '../lib/avatar';
import animateEmoji from '../lib/animate-emoji';
import {useMqParser} from '../lib/tailwind-mqp';
import {colors, isDark} from '../lib/theme';
import {MicOffSvg} from './Svg';
import {openModal} from './Modal';
import {InvoiceModal} from './Invoice';
import reactionEmojis from '../emojis';

export function StageAvatar({
  room,
  speaking,
  canSpeak,
  moderators,
  peerId,
  peerState,
  reactions,
  info,
  handRaised,
  onClick,
}) {
  let mqp = useMqParser();
  let {micMuted, inRoom = null} = peerState || {};
  let reactions_ = reactions[peerId];
  info = info || {id: peerId};
  let isSpeaking = speaking.has(peerId);
  let isModerator = moderators.includes(peerId);
  const colorTheme = room?.color ?? 'default';
  const roomColor = colors(colorTheme);
  const hasNostrIdentity = checkNostrIdentity(info.identities);

  const textColor = isDark(roomColor.avatarBg)
    ? roomColor.text.light
    : roomColor.text.dark;

  return (
    inRoom && (
      <div
        className="p-3 m-2 rounded-lg"
        style={{backgroundColor: roomColor.avatarBg}}
      >
        <li
          key={peerId}
          title={displayName(info, room)}
          className="relative items-center space-y-1 mt-4 ml-2 mr-2"
        >
          <div
            className="human-radius p-1"
            style={{
              backgroundColor: isSpeaking ? roomColor.buttons.primary : 'white',
            }}
          >
            <div
              className="human-radius p-1 relative flex justify-center"
              style={{backgroundColor: 'white'}}
            >
              <img
                className={mqp(
                  'human-radius border border-gray-300 cursor-pointer w-20 h-20 md:w-28 md:h-28 object-cover'
                )}
                alt={displayName(info, room)}
                src={avatarUrl(info, room)}
                onClick={onClick}
              />
              <Reactions
                reactions={reactions_}
                className={mqp(
                  'absolute text-5xl md:text-7xl pt-4 md:pt-5 human-radius w-20 h-20 md:w-28 md:h-28 border text-center'
                )}
                style={{backgroundColor: roomColor.buttons.primary}}
              />
              <div className={handRaised ? '' : 'hidden'}>
                <div
                  className={mqp(
                    'absolute w-9 h-9 top-0 left-0 md:top-0 md:left-0 rounded-full bg-white text-lg border-2 border-gray-400 flex items-center justify-center'
                  )}
                >
                  ✋🏽
                </div>
              </div>              
            </div>
          </div>
          {/* div for showing mute/unmute status */}
          {(!!micMuted || !canSpeak) && (
            <div
              className={mqp(
                'absolute w-10 h-10 right-0 top-12 md:top-20 rounded-full bg-white border-2 text-2xl border-gray-400 flex items-center justify-center'
              )}
              style={{backgroundColor: roomColor.avatarBg}}
            >
              <MicOffSvg
                className="w-5 h-5"
                fill={!canSpeak ? 'red' : undefined}
                stroke={
                  isDark(roomColor.avatarBg)
                    ? roomColor.icons.light
                    : roomColor.icons.dark
                }
              />
            </div>
          )}
          <div className={mqp('w-20 md:w-28 m-2')}>
            <div className="flex">
              <div className={mqp('flex-none text-center pl-1 w-20 md:w-28')}>
                <span
                  className={mqp(
                    'text-sm md:text-base whitespace-nowrap w-22 md:w-30 font-medium'
                  )}
                  style={{color: textColor}}
                >
                  <span
                    className={
                      isModerator
                        ? 'flex-none inline-block leading-3 bg-gray-600 text-white w-3 h-3 rounded-full -ml-3'
                        : 'hidden'
                    }
                    style={{
                      backgroundColor: roomColor.background,
                      color: roomColor.buttons.primary,
                    }}
                  >
                    <svg
                      className="inline-block w-2 h-2"
                      style={{margin: '-3px 0 0 0'}}
                      x="0px"
                      y="0px"
                      viewBox="0 0 1000 1000"
                      enableBackground="new 0 0 1000 1000"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M894.5,633.4L663.3,500l231.1-133.4c39.1-22.6,52.4-72.5,29.9-111.6c-22.6-39.1-72.5-52.4-111.6-29.9L581.7,358.5V91.7c0-45.1-36.6-81.7-81.7-81.7c-45.1,0-81.7,36.6-81.7,81.7v266.9L187.2,225.1c-39.1-22.6-89-9.2-111.6,29.9c-22.6,39.1-9.2,89,29.9,111.6L336.7,500L105.5,633.4C66.5,656,53.1,705.9,75.6,745c22.6,39.1,72.5,52.4,111.6,29.9l231.1-133.4v266.9c0,45.1,36.6,81.7,81.7,81.7c45.1,0,81.7-36.6,81.7-81.7V641.5l231.1,133.4c39.1,22.6,89,9.2,111.6-29.9C946.9,705.9,933.5,656,894.5,633.4z" />
                    </svg>
                  </span>{' '}
                  {displayName(info, room).substring(0, 12)}
                </span>
                <TwitterHandle
                  info={info}
                  divClass="text-center"
                  fontClass="text-sm"
                  roomColor={roomColor}
                />
                <NostrHandle
                  info={info}
                  divClass="text-center"
                  fontClass="text-sm"
                  roomColor={roomColor}
                />
              </div>
            </div>
          </div>
          {hasNostrIdentity ? (
            <div
              className="flex justify-center cursor-pointer"
              onClick={() => {
                openModal(InvoiceModal, {info: info, room: room});
              }}
            >
              <div className="w-6 h-6 rounded-full bg-yellow-200 flex items-center justify-center">
                <span>⚡</span>
              </div>
            </div>
          ) : null}
        </li>
      </div>
    )
  );
}

export function AudienceAvatar({
  room,
  peerId,
  peerState,
  reactions,
  info,
  handRaised,
  onClick,
}) {
  let mqp = useMqParser();
  let {inRoom = null} = peerState || {};
  let reactions_ = reactions[peerId];
  info = info || {id: peerId};
  const colorTheme = room?.color ?? 'default';
  const roomColor = colors(colorTheme);
  const hasNostrIdentity = checkNostrIdentity(info.identities);
  const textColor = isDark(roomColor.avatarBg)
    ? roomColor.text.light
    : roomColor.text.dark;

  return (
    inRoom && (
      <div
        className="p-3 m-2 rounded-lg"
        style={{backgroundColor: roomColor.avatarBg}}
      >
        <li
          title={displayName(info, room)}
          className={mqp('flex-none m-2 w-16 md:w-24 md:h-36 text-xs')}
          style={onClick ? {cursor: 'pointer'} : undefined}
        >
          <div className="relative flex justify-center">
            <img
              className={mqp(
                'human-radius w-16 h-16 md:w-24 md:h-24 border border-gray-300 object-cover'
              )}
              alt={displayName(info, room)}
              src={avatarUrl(info, room)}
              onClick={onClick}
            />
            <Reactions
              reactions={reactions_}
              className={mqp(
                'absolute bg-white text-4xl md:text-6xl pt-3 md:pt-4 human-radius w-16 h-16 md:w-24 md:h-24 border text-center'
              )}
            />
            <div className={handRaised ? '' : 'hidden'}>
              <div
                className={mqp(
                  'absolute w-9 h-9 top-0 left-0 md:top-0 md:left-0 rounded-full bg-white text-lg border-2 border-gray-400 flex items-center justify-center'
                )}
              >
                ✋🏽
              </div>
            </div>
          </div>
          <div
            className="overflow-hidden whitespace-nowrap text-center mt-2"
            style={{color: textColor}}
          >
            {displayName(info, room)}
          </div>
          <TwitterHandle
            info={info}
            divClass="text-center mt-1"
            fontClass="text-xs"
            roomColor={roomColor}
          />
          <NostrHandle
            info={info}
            divClass="text-center mt-1"
            fontClass="text-xs"
            roomColor={roomColor}
          />
        </li>
        {hasNostrIdentity ? (
          <div
            className="flex justify-center cursor-pointer"
            onClick={() => {
              openModal(InvoiceModal, {info: info, room: room});
            }}
          >
            <div className="w-6 h-6 rounded-full bg-yellow-200 flex items-center justify-center">
              <span>⚡</span>
            </div>
          </div>
        ) : null}
      </div>
    )
  );
}

function TwitterHandle({info, divClass, fontClass, roomColor}) {
  let twitterIdentity = info?.identities?.find(i => i.type === 'twitter');
  const textColor = isDark(roomColor.avatarBg)
    ? roomColor.text.light
    : roomColor.text.dark;
  return (
    (twitterIdentity?.id || null) && (
      <div className={divClass}>
        <span className={fontClass}>
          {/* <span className="text-gray-800">@</span> */}
          <a
            className="opacity-70"
            style={{
              textDecoration: 'none',
              fontWeight: 'normal',
              color: twitterIdentity.verificationInfo
                ? roomColor.buttons.primary
                : textColor,
            }}
            href={'https://twitter.com/' + twitterIdentity?.id.replace('@', '')}
            target="_blank"
            rel="noreferrer"
          >
            @{twitterIdentity?.id.replace('@', '')}
          </a>
        </span>
      </div>
    )
  );
}

function NostrHandle({info, divClass, fontClass, roomColor}) {
  let nostrIdentity = info?.identities?.find(i => i.type === 'nostr');
  let shortId = nostrIdentity ? nostrIdentity.id.slice(0, 12) : null;
  const textColor = isDark(roomColor.avatarBg)
    ? roomColor.text.light
    : roomColor.text.dark;

  return (
    (nostrIdentity?.id || null) && (
      <div className={divClass}>
        <span className={fontClass}>
          <a
            className="opacity-70"
            style={{
              textDecoration: 'none',
              fontWeight: 'normal',
              color: nostrIdentity.verificationInfo
                ? roomColor.buttons.primary
                : textColor,
            }}
            href={'https://primal.net/p/' + nostrIdentity?.id}
            target="_blank"
            rel="noreferrer"
          >
            @{shortId + '...'}
          </a>
        </span>
      </div>
    )
  );
}

function checkNostrIdentity(identities) {
  const hasNostrIdentity = identities?.some(
    identity => identity.type === 'nostr'
  );

  return hasNostrIdentity;
}

function Reactions({reactions, className}) {
  if (!reactions) return null;
  return (
    <>
      {reactions.map(
        ([r, id]) =>
          reactionEmojis.includes(r) && (
            <AnimatedEmoji
              key={id}
              emoji={r}
              className={className}
              style={{
                alignSelf: 'center',
              }}
            />
          )
      )}
    </>
  );
}

function AnimatedEmoji({emoji, ...props}) {
  let [element, setElement] = useState(null);
  useEffect(() => {
    if (element) animateEmoji(element);
  }, [element]);
  return (
    <div ref={setElement} {...props}>
      {emoji}
    </div>
  );
}
