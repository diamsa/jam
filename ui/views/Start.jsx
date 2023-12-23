import React, {useState, useEffect} from 'react';
import {navigate} from '../lib/use-location';
import {useJam} from '../jam-core-react';
import {colors, isDark} from '../lib/theme';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import StartRoomCard from './StartRoomCard';

export default function Start({newRoom = {}, urlRoomId, roomFromURIError}) {
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomList, setRoomList] = useState([]);
  const [{room}, {enterRoom, setProps, createRoom, listRooms}] = useJam();
  
  let {stageOnly = false} = newRoom;

  useEffect(() => {
    const loadRooms = async () => {
      setLoadingRooms(true);
      let roomlist = await(listRooms());
      setRoomList(roomlist[0]);
      setLoadingRooms(false);
      console.log(roomlist);
    };
    loadRooms();
  }, []);
  
  let submit = e => {
    e.preventDefault();
    setProps('userInteracted', true);
    let roomId;
    const mn = bip39.generateMnemonic(wordlist).split(' ');
    const roomNum = (Math.floor(Math.random() * 1000)+1).toString();
    roomId = mn[0] + mn[1] + roomNum;
    
    (async () => {
      let roomPosted = {stageOnly};
      let ok = await createRoom(roomId, roomPosted);
      if (ok) {
        if (urlRoomId !== roomId) navigate('/' + roomId);
        enterRoom(roomId);
      }
    })();
  };

  const colorTheme = room?.color ?? 'default';
  const roomColors = colors(colorTheme);

  const textColor = isDark(roomColors.background)
    ? roomColors.text.light
    : roomColors.text.dark;

  return (
    <div className="p-10 max-w-s h-screen flex flex-col justify-evenly m-auto text-center items-center">

      <div>
        <img src="{jamServerLogo}" />
      </div>

      <div
        className={
          roomFromURIError
            ? 'mb-12 p-4 text-gray-700 rounded-lg border border-yellow-100 bg-yellow-50'
            : 'hidden'
        }
      >
        The Room ID{' '}
        <code className="text-gray-900 bg-yellow-200">{urlRoomId}</code> is not
        valid.
        <br />
        <br />
        <br />
        You can use the button below to start a room.
      </div>

      <div>
        <p style={{color: textColor}}>
          Nostr Live Audio Spaces
          is for chatting, brainstorming, debating, jamming,
          micro-conferences and more. Press the button below to start a room.
        </p>
        <br />

        <button
          onClick={submit}
          className="select-none h-12 px-6 text-lg rounded-lg mt-3"
          style={{
            backgroundColor: roomColors.buttons.primary,
            color: isDark(roomColors.buttons.primary)
              ? roomColors.text.light
              : roomColors.text.dark,
          }}
        >
          Start room
        </button>

        { loadingRooms ? (<h4>Loading...</h4>) : (roomList?.map((roomInfo) => {
          return <StartRoomCard roomInfo={roomInfo} key={roomInfo.roomId} />
          }))
        }

        <br />
        <div style={{color: textColor}} className="jam">
          <p style={{color: textColor, backgroundColor: roomColors.background}} className="room-header">
          Built by Jam Systems and Nostr Live Audio Spaces Developers.
          </p>
          <p style={{color: textColor, backgroundColor: roomColors.background}} className="room-header">
          Download from <a href="https://github.com/diamsa/jam">github.com/diamsa/jam</a> to host and run your own instance.
          </p>
        </div>
      </div>
    </div>
  );
}
