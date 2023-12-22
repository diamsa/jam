import React from 'react';

export default function StartRoomCard({
    roomInfo,
  }) {
    const roomId = roomInfo?.roomId ?? 'unknown-room';
    //const topic = roomInfo?.topic ?? '';
    const userCount = roomInfo?.userCount ?? -1;
    // todo: display list of users, or first few of them as names or avatars?
    //const userInfo = roomInfo?userInfo ?? new [];

    var coloringStyle = {
        backgroundColor: '#444488',
        color: '#ffffcc',
        width: '300px',
        cursor: 'pointer',
        float: 'left',
    };

    return (
        <div>
        <a href={`./${roomId}`}>
        <div className="select-none h-24 px-6 text-lg rounded-lg mt-3"
             style={coloringStyle}
        >
            <div 
                className="human-radius p-1 relative flex justify-center"
            >
                Join {userCount} chatting in <br /><br /> {roomId}
            </div>
        </div>
        </a>
        </div>
    );
}
