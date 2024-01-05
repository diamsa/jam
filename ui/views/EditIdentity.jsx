import React, {useState} from 'react';
import {Modal} from './Modal';
import {useMqParser} from '../lib/tailwind-mqp';
import {use} from 'use-minimal-state';
import {useJam} from '../jam-core-react';
import {getUserMetadata, setDefaultZapsAmount} from '../nostr/nostr';
import {nip19} from 'nostr-tools';
import {isDark, colors} from '../lib/theme';
import {UploadFile} from './Svg';

function addNostr(identities, handle, nostrNote) {
  if (!handle) return;
  const startWithNpub = handle.startsWith('npub');
  const hasNpubLength = handle.length === 63;

  if (startWithNpub && hasNpubLength) {
    identities.push({type: 'nostr', id: handle, verificationInfo: nostrNote});
  }
}

export default function EditIdentity({close}) {
  const [state, {updateInfo}] = useJam();
  const [id, myIdentity] = use(state, ['myId', 'myIdentity']);
  const info = myIdentity?.info;
  const nostrIdentity = info?.identities?.find(i => i.type === 'nostr');
  const mqp = useMqParser();
  const colorTheme = state.room?.color ?? 'default';
  const roomColor = colors(colorTheme, state.room.customColor);
  let nostrNote = nostrIdentity?.verificationInfo;

  let [name, setName] = useState(info?.name ?? info?.displayName);
  let [nostr, setNostr] = useState(nostrIdentity?.id);
  let [nostrInput, setNostrInput] = useState(nostrIdentity?.verificationInfo);
  const [showErrorMsg, setErrorMsg] = useState(false);
  const [showNostrVerify, setShowNostrVerify] = useState(false);
  const [pictureName, setPictureName] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);
  let [defaultZap, setDeafultZap] = useState(
    localStorage.getItem('defaultZap') ?? ''
  );

  const LoadingIcon = () => {
    return (
      <div className="flex justify-center">
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 6.627 5.373 12 12 12v-4c-3.313 0-6-2.687-6-6z"
          ></path>
        </svg>
      </div>
    );
  };

  const processFile = file => {
    return new Promise((res, rej) => {
      try {
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
          // e.preventDefault();
          let avatar = reader.result;
          res(avatar);
        };
      } catch (error) {
        console.log('There was an error with the image');
        rej(undefined);
      }
    });
  };

  const updateValues = async (file, identities) => {
    if (file) {
      const avatar = await processFile(file);
      if (!avatar) return;

      const ok = await updateInfo({name, avatar, identities});
      if (ok) close();
      setErrorMsg('The profile picture size must be less than 500kb.');
      setIsLoading(false);
    } else {
      if (nostr) {
        const pubkey = nip19.decode(nostr).data;
        const metadata = await getUserMetadata(pubkey, [], null);
        if (!metadata) {
          const ok = await updateInfo({name, identities});
          if (ok) close();
        }
        const avatar = metadata.picture;
        const name = metadata.name;
        let ok = await updateInfo({name, identities, avatar});
        if (ok) close();
      } else {
        let ok = await updateInfo({name, identities});
        if (ok) close();
      }
    }
  };

  let submit = async e => {
    e.preventDefault();

    sessionStorage.clear();

    setIsLoading(true);

    let identities = [];
    addNostr(identities, nostr, nostrInput);

    const selectedFile = document.getElementById('file_upload').files[0];

    setDefaultZapsAmount(defaultZap);

    await updateValues(selectedFile, identities);
  };

  let cancel = e => {
    e.preventDefault();
    close();
  };

  return (
    <Modal close={close}>
      <h1>Edit Profile</h1>
      <br />
      <form onSubmit={submit}>
        <input
          className="rounded placeholder-gray-400 bg-gray-50 w-48"
          type="text"
          placeholder="Display name"
          value={name ?? ''}
          name="display-name"
          onChange={e => {
            setName(e.target.value);
          }}
        />
        <div className="p-2 text-gray-500 italic">
          {`What's your name?`}
          <span className="text-gray-300"> (optional)</span>
        </div>
        <br />
        {/* <input
          type="file"
          accept="image/*"
          className="edit-profile-file-input rounded placeholder-gray-400 bg-gray-50 w-72"
        /> */}
        <div class="max-w-xl">
          <label class="flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
            <span class="flex items-center space-x-2">
              <UploadFile />
              <span class="font-medium text-gray-600">
                {pictureName
                  ? pictureName
                  : ' Drop files to Attach, or browse your device'}
              </span>
            </span>
            <input
              type="file"
              id="file_upload"
              onChange={e => {
                const fileName = e.target.value.slice(12);
                setPictureName(fileName);
              }}
              accept="image/*"
              class="hidden"
            />
          </label>
        </div>
        <div className="p-2 text-gray-500 italic">
          Set your profile picture. If your picture is too large, try
          compressing it{' '}
          <a
            href="https://tinypng.com/"
            target="blank"
            className="text-blue-500"
          >
            here
          </a>
          <span className="text-gray-300"> (optional)</span>
        </div>
        <br />

        <input
          className="rounded placeholder-gray-400 bg-gray-50 w-48"
          type="text"
          placeholder="npub1234"
          value={nostr ?? ''}
          name="Nostr"
          onChange={e => {
            setNostr(e.target.value);
          }}
        />

        <span className="text-gray-500">
          {/* heroicons/fingerprint */}
          <svg
            className={
              nostrNote
                ? 'text-blue-600 pl-2 mr-1 h-6 w-6 inline-block'
                : 'pl-2 mr-1 h-6 w-6 inline-block'
            }
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
            />
          </svg>
          <span>
            <span
              className={nostrNote ? 'hidden' : 'underline'}
              style={{cursor: 'pointer'}}
              onClick={() => setShowNostrVerify(!showNostrVerify)}
            >
              verify
            </span>
            <span
              className={nostrNote ? '' : 'hidden'}
              onClick={() => setShowNostrVerify(!showNostrVerify)}
            >
              verified
            </span>
          </span>
        </span>

        <div className="p-2 text-gray-500 italic">
          {`Set your nostr npub`}
          <span className="text-gray-300"> (optional)</span>
          <br />
        </div>
        <br />

        <input
          className="rounded placeholder-gray-400 bg-gray-50 w-48"
          type="number"
          placeholder="10000"
          value={defaultZap ?? ''}
          onChange={e => {
            setDeafultZap(e.target.value);
          }}
        />
        <div className="p-2 text-gray-500 italic">
          {`Set up a default zap amount`}
          <span className="text-gray-300"> (optional)</span>
          <br />
        </div>

        <div
          className={showNostrVerify ? 'p-2 text-gray-500 italic' : 'hidden'}
        >
          <p>
            <a
              className="underline not-italic text-blue-600 hover:text-blue-800 visited:text-purple-600"
              href={'https://primal.net/home'}
              target="_blank"
              rel="noreferrer"
            >
              Create a nostr post with your Jam public key
            </a>
            <br />
            to verify your nostr npub
          </p>
          <pre
            style={{fontSize: '0.7rem'}}
            className={mqp(
              'rounded-md bg-yellow-50 not-italic text-xs text-center py-2 -ml-2 mt-2 md:text-base'
            )}
          >
            {id}
          </pre>

          <input
            className="tweet mt-2 -ml-2 rounded placeholder-gray-400 bg-gray-50 w-72"
            type="text"
            placeholder="Nostr note ID"
            name="Note ID"
            value={nostrInput ?? ''}
            onChange={e => setNostrInput(e.target.value)}
          />
        </div>

        <br />
        <hr />
        <br />
        {showErrorMsg ? <p className="text-red-500">{showErrorMsg}</p> : null}
        <div className="flex">
          <button
            onClick={submit}
            className="flex-grow mt-5 h-12 px-6 text-lg rounded-lg"
            style={{
              color: isDark(roomColor.buttons.primary)
                ? roomColor.text.light
                : roomColor.text.dark,
              backgroundColor: roomColor.buttons.primary,
            }}
          >
            {isLoading ? <LoadingIcon /> : 'Done'}
          </button>
          <button
            onClick={cancel}
            className="flex-none mt-5 h-12 px-6 text-lg text-black bg-gray-100 rounded-lg focus:shadow-outline active:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
