import * as ReactDOM from 'react-dom/client';
import React, {useEffect, useRef, useState} from 'react';
import {IBackend} from "../shared/IBackend";
// import vanjacloud from 'vanjacloudjs.shared';
// hacky below, to bypass key load mes temporaril
import {ThoughtDB} from "../../../vanjacloudjs.shared/dist/src/notion";
import {Translator} from "../shared/translate";
import {MicrophoneUI} from "./microphone";

let thoughtdb: any = null;
let translator: Translator = null;

const isDevelopment = process.env.NODE_ENV == 'development';

console.log('isDev', isDevelopment)

function initThoughtDb(notionkey: string, db: string) {
  if(notionkey == null || notionkey == undefined) {
    console.warn('no notion key');
    return;
  }
  thoughtdb = new ThoughtDB(notionkey, db)
}

function getThoughtDb() {
  return thoughtdb;
}

function TranslationView(props: { translation?: string[2][] }) {
  const {translation} = props;
  if (translation == null) {
    return null;
  }
  return <>
    <h3>Translation</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 6fr', gridGap: '10px' }}>
      {translation.map(([text, lang]) => <>
        <div style={{fontWeight: 'bold'}} key={lang}>{lang.slice(0, 2)}</div>
        <div key={lang+'-text'}>{text}</div>
      </>
      )}
    </div>
  </>
}

const NUM_MODES = 3;

function MyApp() {
  const [text, setText] = useState('Piensalo...');
  const [isSpinning, setIsSpinning] = useState(false);
  const [translation, setTranslation] = useState<string[2][]>();
  const [mode, setMode] = useState(0);

  const handleKeyDownGlobal = (event) => {
    if (event.key === 'Escape') {
      console.log('escape pressed');
      event.preventDefault();
      setTranslation(null);
      setMode(0)
    }

    // this doesnt work because mode is snapshotted welp
    if (event.metaKey && event.shiftKey) {
      if(event.key === '[') {
        let newMode = mode == 0 ? NUM_MODES - 1 : mode - 1;
        console.log('down mode', newMode, mode)
        setMode(newMode);
      } else if(event.key === ']') {

        let newMode = mode == NUM_MODES - 1 ? 0 : mode + 1;
        console.log('up mode', newMode, mode)
        setMode(newMode);

      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDownGlobal);

    return () => {
      document.removeEventListener('keydown', handleKeyDownGlobal);
    };
  }, []);

  async function save(msg: string) {

    setIsSpinning(true)
    try {
      await getThoughtDb().saveIt(msg);
    } catch (e) {
      console.log('saveIt failed', e, msg);
    }
    setIsSpinning(false)
  }

  async function onSave() {
    await save(text);
    setText('')
  }

  async function onTranslate() {
    setIsSpinning(true)
    const r1 = await translator.translate(text);
    setIsSpinning(false)
    setTranslation(r1.map((r:any) => [r.text, r.to]))
  }

  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current.select();
  }, []);


  const handleKeyDown = async (event: any) => {
    if (event.key === 'Enter' && event.metaKey) {
      /* show message box */

      console.log('enter pressed');

      event.preventDefault();
      if(event.shiftKey) {
        await onTranslate();
      } else {
        await save(text);
        setText('')
      }
      // inputRef.current.blur();
    }
  };

  if (translation != null) {
    return <TranslationView
        translation={translation} />
  }

  if(mode == 1) {
    return <MicrophoneUI backend={backend} />
  }

  return <>
    <h2>{isDevelopment && ' DEVELOPMENT'}</h2>

    <style>
      {`
          textarea::selection {
            background-color: lightpurple;
          }
        `}
    </style>
    <textarea
        ref={inputRef}
        rows={4} cols={50} autoFocus
        onKeyDown={handleKeyDown}
        value={text}
        onChange={(event) => setText(event.target.value)}
        style={{
          filter: isSpinning ? 'blur(5px)' : '',
        }}
    />
    <br/>
    <br/>
    <br/>
    <button onClick={onSave}>save</button>
    <button onClick={onTranslate}>translate</button>
  </>
}


function render() {


  ReactDOM.createRoot(
      // document.body
      document.getElementById('root')
  )
  .render(<>
    <MyApp/>
  </>);
}

const backend = (window as any).backend as IBackend

// this part doesnt work:
// backend.send('', 'Hello from app.tsx!');
// backend.receive('', (event: any, message: any) => {
//   console.log('app.tsx received message', event, message);
//
//   if(message.type == 'notion') {
//     initThoughtDb(message.notionkey, message.dbid);
//   }
// });


async function init() {
  const r = await backend.request('', 'GetNotionInfo');
  console.log('cwd', r.cwd);
  initThoughtDb(r.notionkey, r.dbid);
  translator = new Translator(r.azureTranslateKey);
  console.log(r.azureTranslateKey)
}

init();
render();