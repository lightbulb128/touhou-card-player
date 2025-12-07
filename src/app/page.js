'use client';

import { List, ListItem, Typography, Tabs, Tab, Paper, Box, Stack, TextField, Grid, Divider } from "@mui/material";
import { useState, useRef, useEffect, useMemo } from "react";
import Button from '@mui/material/Button';
import { ThemeProvider, createTheme } from "@mui/material/styles";
import localFont from "next/font/local";
import docCookies from "./docCookies";
import MusicPlayerPanel from "./musicPlayerPanel";
import { keyframes } from "@mui/material/styles";
import TransitionTab from "./transitionTab";
import { getMusicFilename, getMusicName, hashToInt } from "./utils";
import PlayList from "./playList";
import { PlaySlider, PlayControls } from "./playControls";
import MusicIdSelectPanel from "./musicIdSelectPanel";
import { isCardPrefixValid } from "./musicIdSelectPanel";
import GameSimulatorPanel from "./gameSimulatorPanel";
import useMediaQuery from '@mui/material/useMediaQuery';
import Link from "next/link";

const constrainedWidth = {
  width: '100%',
  '@media (min-width: 720px)': {
    width: '720px',
  },
  '@media (min-width: 1200px)': {
    width: '60%',
  },
}

const expandKeyframes = keyframes({
  "from": {
    marginLeft: "-7%",
    backgroundColor: "red"
  },
  "to": {
    marginLeft: "0%",
    backgroundColor: "blue"
  }
})


const inter = localFont({ 
  src: [{
    path: './yumin.ttf',
    weight: 'normal',
  }],
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
  typography: {
    fontFamily: inter
  }
});

const BoxPaper = ({ children, padding = 1}) => {
  return <Box sx={{width: "100%"}} padding={1}>
    <Paper variant="outlined" sx={{
      overflow: "hidden",
    }}>
      <Box padding={padding}>
      {children}
      </Box>
    </Paper>
  </Box>
}

function loadMusicPlayerStateCookies(data, getDefaultValue = false) {
  let dataCharacters = data["data"];
  let characters = Object.keys(dataCharacters);
  
  let musicPlayerState = {
    "playOrder": characters,
    "currentPlaying": characters[0],
  }
  {
    let musicIds = {};
    let temporarySkip = {};
    characters.forEach((character, index) => {
      musicIds[character] = 0;
      temporarySkip[character] = false;
    })
    musicPlayerState["musicIds"] = musicIds;
    musicPlayerState["temporarySkip"] = temporarySkip;
  }
  if (getDefaultValue) {
    return musicPlayerState;
  }

  {
    try {
      let playOrder = docCookies.getItem("playOrder");
      let loaded = []
      if (playOrder !== null) {
        playOrder = playOrder.split(",");
        playOrder.forEach((idString) => {
          let v = parseInt(idString);
          if (v < 0 || v >= characters.length) {
            throw new Error("Invalid playOrder cookie");
          }
          loaded.push(characters[v]);
        })
        musicPlayerState["playOrder"] = loaded;
      }
    } catch (e) {
      console.error("Error loading playOrder from cookies", e);
      docCookies.removeItem("playOrder");
    }
  }

  {
    try {
      let currentPlaying = docCookies.getItem("currentPlaying");
      if (currentPlaying !== null) {
        let v = parseInt(currentPlaying);
        if (v < 0 || v >= characters.length) {
          throw new Error("Invalid currentPlaying cookie");
        }
        musicPlayerState["currentPlaying"] = characters[v];
      }
    } catch (e) {
      console.error("Error loading currentPlaying from cookies", e);
      docCookies.removeItem("currentPlaying");
    }
  }

  {
    try {
      let cookieMusicIds = docCookies.getItem("musicIds");
      if (cookieMusicIds !== null) {
        cookieMusicIds = cookieMusicIds.split(",");
        if (cookieMusicIds.length !== characters.length) {
          throw "Invalid musicIds length";
        }
        let newMusicIds = {}
        cookieMusicIds.forEach((id, index) => {
          let v = parseInt(id);
          if (Number.isNaN(v) || v < -1 || v >= data.data[characters[index]]["music"].length) {
            throw "Invalid music id";
          }
          newMusicIds[characters[index]] = v;
        })
        if (newMusicIds[musicPlayerState.currentPlaying] === -1) {
          newMusicIds[musicPlayerState.currentPlaying] = 0;
        }
        musicPlayerState["musicIds"] = newMusicIds;
      }
    } catch (e) {
      console.error("Error loading musicIds from cookies", e);
      docCookies.removeItem("musicIds");
    }
  }

  return musicPlayerState;

}

export default function Page() {

  const isSmallScreen = !useMediaQuery("(min-width:600px)");
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [musicPlayerState, setMusicPlayerState] = useState({
    "playOrder": [],
    "currentPlaying": "",
    "musicIds": {},
    "temporarySkip": {},
  });
  const [playbackState, setPlaybackState] = useState({
    "playingCountdownTimeout": null,
    "playbackTimeout": null,
    "paused": true,
    "playbackPaused": false,
  })
  const [audioState, setAudioState] = useState({
    currentTime: 0,
    duration: 0,
  })
  const [optionState, setOptionState] = useState({
    "cardPrefix": "cards/",
    "relativeRoot": "",
    "randomPlayPosition": false,
    "countdown": false,
    "playbackTime": 0,
    "glitch": false,
    "loadTime": 0,
  });
  const audioRef = useRef(null);
  const audioCountdownRef = useRef(null);
  const [tabValue, setTabValue] = useState(0);
  const tabValueRef = useRef(null);
  const nextMusicCallback = useRef(null);

  const globalState = {
    musicPlayerState, setMusicPlayerState,
    playbackState, setPlaybackState,
    audioState, setAudioState,
    optionState, setOptionState,
  }
  const globalRefs = {
    audioRef, audioCountdownRef
  }

  useEffect(() => {
    tabValueRef.current = tabValue;
  }, [tabValue])

  useEffect(() => {

    {

      const entirePath = window.location.href;

      // remove query
      let relativeRoot = entirePath;
      if (entirePath.includes("?")) {
        relativeRoot = entirePath.substring(0, entirePath.indexOf("?"));
      }

      console.log("relativeRoot", relativeRoot);
  
      const query = window.location.search;
      const params = new URLSearchParams(query);
      let glitch = false;
      if (params.has("g")) {
        glitch = true;
      }

      let loaded = {};
      try {
        let cookieCardPrefix = docCookies.getItem("cardPrefix");
        if (cookieCardPrefix !== null) {
          if (isCardPrefixValid(cookieCardPrefix)) {
            loaded = {
              ...loaded,
              cardPrefix: cookieCardPrefix
            };
          } else {
            throw "Invalid card prefix";
          }
        }
      } catch (e) {
        console.error("Error loading cardPrefix from cookies", e);
        docCookies.removeItem("cardPrefix");
      }

      let cookieCountdown = docCookies.getItem("countdown");
      if (cookieCountdown === "T") {loaded.countdown = true;}
      else if (cookieCountdown === "F") {loaded.countdown = false;}
      else {
        docCookies.removeItem("countdown");
      }

      let cookieRandomPlayPosition = docCookies.getItem("randomPlayPosition");
      if (cookieRandomPlayPosition === "T") {loaded.randomPlayPosition = true;}
      else if (cookieRandomPlayPosition === "F") {loaded.randomPlayPosition = false;}
      else {
        docCookies.removeItem("randomPlayPosition");
      }

      setOptionState({
        ...optionState,
        ...loaded,
        relativeRoot: relativeRoot + "/",
        glitch: glitch,
        loadTime: Date.now()
      });
      
    }

    if (!isLoading) return;
    fetch('data.json')
      .then(response => response.json())
      .then(data => {

        let idPresets = {};
        let characters = Object.keys(data.data);
        let defaultPreset = {}
        characters.forEach((key) => {
          defaultPreset[key] = 0;
        })
        idPresets["默认"] = defaultPreset;

        Object.entries(data.idpresets).forEach(([presetName, preset]) => {
          idPresets[presetName] = preset;
        })

        let tags = []
        Object.entries(data.data).forEach(([key, value]) => {
          value.tags.forEach((tag) => {
            if (!tags.includes(tag)) {
              tags.push(tag);
            }
          })
        });

        tags.forEach((tagName) => {
          let preset = {}
          Object.entries(data.data).forEach(([key, value]) => {
            let characterTags = value["tags"];
            if (characterTags.includes(tagName)) {
              preset[key] = -1;
            }
          })
          idPresets["屏蔽" + tagName] = preset;
        })

        data.idpresets = idPresets;

        setData(data);

        let loadedCookies = loadMusicPlayerStateCookies(data);
        setMusicPlayerState(loadedCookies);

        setIsLoading(false);
      })
  }, [])

  const characterInPlaylist = (musicPlayerState, character, allowTemporarySkip = false) => {
    if (musicPlayerState.musicIds[character] === -1) {
      return false;
    }
    if (!allowTemporarySkip) {
      if (musicPlayerState.temporarySkip[character]) {
        return false;
      }
    }
    return true;
  }
  const findNextCharacterInPlaylist = (musicPlayerState, character) => {
    let playOrder = musicPlayerState.playOrder;
    let currentIndex = playOrder.indexOf(character);
    for (let i = 1; i < playOrder.length; i++) {
      let nextIndex = (currentIndex + i) % playOrder.length;
      let nextCharacter = playOrder[nextIndex];
      if (characterInPlaylist(musicPlayerState, nextCharacter)) {
        return [nextIndex, nextCharacter];
      }
    }
    return [null, null];
  }
  const findPreviousCharacterInPlaylist = (musicPlayerState, character) => {
    let playOrder = musicPlayerState.playOrder;
    let currentIndex = playOrder.indexOf(character);
    for (let i = 1; i < playOrder.length; i++) {
      let previousIndex = (currentIndex - i + playOrder.length) % playOrder.length;
      let previousCharacter = playOrder[previousIndex];
      if (characterInPlaylist(musicPlayerState, previousCharacter)) {
        return [previousIndex, previousCharacter];
      }
    }
    return [null, null];
  }
  const findFirstCharacterInPlaylist = (musicPlayerState) => {
    let playOrder = musicPlayerState.playOrder;
    for (let i = 0; i < playOrder.length; i++) {
      let character = playOrder[i];
      if (characterInPlaylist(musicPlayerState, character)) {
        return character;
      }
    }
    return null;
  }

  const userPause = () => {
    setPlaybackState({
      ...playbackState,
      paused: true
    });
    if (globalRefs.audioRef.current) {
      globalRefs.audioRef.current.pause();
    }
  }

  const playbackPause = () => {
    setPlaybackState({
      ...playbackState,
      playbackPaused: true
    });
    if (globalRefs.audioRef.current) {
      globalRefs.audioRef.current.pause();
    }
  }

  const playMusicOfCharacter = (character, additionalPlaybackState = {}, additionalMusicPlayerState = {}) => {
    let playbackTimeout = null;
    if (optionState.playbackTime > 0) {
      playbackTimeout = setTimeout(() => {
        playbackPause();
      }, optionState.playbackTime * 1000);
    }
    setPlaybackState({
      ...playbackState,
      ...additionalPlaybackState,
      playbackPaused: false,
      playbackTimeout: playbackTimeout
    })
    setMusicPlayerState({
      ...musicPlayerState,
      ...additionalMusicPlayerState,
      currentPlaying: character,
    });
    docCookies.setItem("currentPlaying", Object.keys(data.data).indexOf(character));
  }

  const playNextMusic = (additionalToSet = {}) =>{
    let [_, nextCharacter] = findNextCharacterInPlaylist(musicPlayerState, musicPlayerState.currentPlaying)
    if (nextCharacter === null) {
      console.warn("No next character found in playlist");
      return;
    }
    playMusicOfCharacter(nextCharacter, additionalToSet)
    if (nextMusicCallback.current) {
      nextMusicCallback.current();
    }
  }
  
  const onNextMusicClick = () => {
    if (!optionState.countdown) {
      playNextMusic();
      return;
    } else {
      if (globalRefs.audioCountdownRef.current) {
        globalRefs.audioCountdownRef.current.play();
      }
      setPlaybackState({
        ...playbackState,
        playingCountdownTimeout: setTimeout(() => {
          playNextMusic({
            playingCountdownTimeout: null
          });
        }, 3000)
      })
    }
  }
  
  const onPreviousMusicClick = () => {
    let [_, previousCharacter] = findPreviousCharacterInPlaylist(musicPlayerState, musicPlayerState.currentPlaying)
    if (previousCharacter === null) {
      console.warn("No previous character found in playlist");
      return;
    }
    playMusicOfCharacter(previousCharacter);
  }

  const reroll = (random = false) => {
    userPause();
    let characters = Object.keys(data.data);
    let temporarySkip = {};
    for (let i = 0; i < characters.length; i++) {
      temporarySkip[characters[i]] = false;
    }
    let playOrder = [];
    for (let i = 0; i < characters.length; i++) {
      if (musicPlayerState.musicIds[characters[i]] !== -1) {
        playOrder.push(characters[i]);
      }
    }
    if (random) {
      for (let i = playOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        let temp = playOrder[i];
        playOrder[i] = playOrder[j];
        playOrder[j] = temp;
      }
    }
    let newMusicPlayerState = {
      ...musicPlayerState,
      playOrder: playOrder,
      temporarySkip: temporarySkip,
    }
    let currentPlaying = findFirstCharacterInPlaylist(newMusicPlayerState);
    if (currentPlaying === null) {
      console.warn("No valid character found in playlist");
      return;
    }
    newMusicPlayerState.currentPlaying = currentPlaying;
    setMusicPlayerState(newMusicPlayerState);
    
    // set cookies
    let playOrderString = playOrder.map((character) => {
      return characters.indexOf(character);
    }).join(",");
    docCookies.setItem("playOrder", playOrderString);
    docCookies.setItem("currentPlaying", characters.indexOf(currentPlaying));
  }

  const onPauseMusicClick = () => {
    const playbackPaused = playbackState.playbackPaused;
    const paused = playbackState.paused;
    let updater = {...playbackState}
    if (!playbackPaused) updater.paused = !paused;
    updater.playbackPaused = false;
    setPlaybackState(updater);
    if (globalRefs.audioRef.current) {
      let audioRef = globalRefs.audioRef;
      if (paused || playbackPaused) {
        audioRef.current.play().catch((e) => {
          console.log("Failed to play", e);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }

  const globalMethods = {
    "userPause": userPause,
    "reroll": reroll,
    "setTemporarySkip": (character) => {
      let newTemporarySkip = {...musicPlayerState.temporarySkip}
      newTemporarySkip[character] = !newTemporarySkip[character];
      setMusicPlayerState({
        ...musicPlayerState,
        temporarySkip: newTemporarySkip
      })
    },
    "getMusicName": getMusicName,
    "getMusicFilename": getMusicFilename,
    "playMusicOfCharacter": playMusicOfCharacter,
    "characterInPlaylist": characterInPlaylist,
    "findNextCharacterInPlaylist": findNextCharacterInPlaylist,
    "findPreviousCharacterInPlaylist": findPreviousCharacterInPlaylist,
    "onNextMusicClick": onNextMusicClick,
    "onPreviousMusicClick": onPreviousMusicClick,
    "onPauseMusicClick": onPauseMusicClick,
    "registerNextMusicCallback": (callback) => {
      nextMusicCallback.current = callback;
    }
  }

  const memoizedMusicIdSelectPanel = useMemo(() => {
    return <MusicIdSelectPanel
      data={data} globalState={globalState} globalMethods={globalMethods}
    ></MusicIdSelectPanel>
  }, [data, globalState.musicPlayerState.musicIds, globalState.optionState.cardPrefix, globalMethods])
  const [renderGameSimulatorPanel, setRenderGameSimulatorPanel] = useState(false);

  useEffect(() => {
    if (tabValue === 3) {
      setRenderGameSimulatorPanel(true);
    } 
    // else {
    //   setTimeout(() => {
    //     if (tabValueRef.current !== null && tabValueRef.current !== 3) {
    //       setRenderGameSimulatorPanel(false);
    //     }
    //   }, 1000);
    // }
  }, [tabValue])

  const tabButtonSx = isSmallScreen ? {
    whiteSpace: "nowrap",
    textTransform: "none",
    minWidth: "3rem", height: "2rem", fontSize: "1rem",
  } : {
    whiteSpace: "nowrap",
    textTransform: "none",
    minWidth: "clamp(3rem, 7.5vw, 3.6rem)", height: "clamp(2rem, 5vw, 2.4rem)", fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
  }
  function createTabButton(index, value, text) {
    return <Button
      onClick={() => setTabValue(index)}
      className="chinese"
      color={value === index ? "warning" : "primary"}
      size="small"
      sx={tabButtonSx}
    >{text}</Button>
  }

  function createFunButton(text, onClick=null, color="primary", additionalSx={}) {
    return <Button
      onClick={onClick}
      className="chinese"
      size="small"
      color={color}
      sx={{
        ...tabButtonSx,
        ...additionalSx
      }}
    >{text}</Button>
  }

  return <ThemeProvider theme={darkTheme}>
    {isLoading ? <div>Loading...</div> : <Box align="center" alignItems="center" justifyContent="center" sx={{width: "100%"}}>
      <Box sx={{
        width: '100%',
        backgroundColor: "black",
      }} 
        padding={1}
        align="center" alignItems="center" justifyContent="center"
      >
        <Box
          paddingBottom={1}
          paddingTop={1}
        >
          <Stack direction="row" spacing={1} useFlexGap 
            divider={<Divider orientation="vertical" flexItem />}
          sx={{
            justifyContent: "center",
            display: "flex",
            flexWrap: "wrap"
          }}>
            {createTabButton(0, tabValue, "卡牌")}
            {createTabButton(1, tabValue, "列表")}
            {createFunButton(
              isSmallScreen ? "Alice!" : "We need more Alice!", 
              () => {
                const keyword = "アリス";
                // find character name with that keyword
                let characters = Object.keys(data.data);
                let found = [];
                characters.forEach((character) => {
                  if (character.includes(keyword)) {
                    found.push(character);
                  }
                })
                if (found.length === 0) {return;}
                found = found[0];
                if (musicPlayerState.musicIds[found] === -1) {return;}
                if (musicPlayerState.temporarySkip[found]) {return;}
                if (musicPlayerState.currentPlaying === found) {return;}
                playMusicOfCharacter(found);
            }, "warning")}
            {createTabButton(2, tabValue, "设定")}
            {!isSmallScreen && createTabButton(3, tabValue, "游戏")}
            {createFunButton("源码", () => {
              window.open("https://github.com/lightbulb128/touhou-card-player");
            }, "primary", {
              textDecoration: "underline"
            })}
          </Stack>
        </Box>

        <Box sx={{
          display: "flex",
          flexWrap: "nowrap",
          overflow: "hidden",
        }}>
          <TransitionTab index={0} value={tabValue}>
            <BoxPaper>
              <MusicPlayerPanel
                data={data}
                onNextClick={onNextMusicClick}
                onPauseClick={onPauseMusicClick}
                onPreviousClick={onPreviousMusicClick}
                globalMethods={globalMethods}
                globalRefs={globalRefs}
                globalState={globalState}
              ></MusicPlayerPanel>
            </BoxPaper>
            <BoxPaper>
              <Stack spacing={1} align="center" alignItems="center">
                <Stack direction="row" spacing={1}>
                  <Button className="chinese" variant="outlined" color="warning" onClick={() => {reroll(true);}}>重新抽选</Button>
                  <Button className="chinese" variant="outlined" color="warning" onClick={() => {reroll(false);}}>顺序排列</Button>

                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button className="chinese" variant={optionState.randomPlayPosition ? "contained" : "outlined"} color="primary" onClick={() => {
                    setOptionState({
                      ...optionState,
                      randomPlayPosition: !optionState.randomPlayPosition
                    });
                    docCookies.setItem("randomPlayPosition", optionState.randomPlayPosition ? "F" : "T");
                  }}>随机位置播放</Button>
                  <Button className="chinese" variant={optionState.countdown ? "contained" : "outlined"} color="primary" onClick={() => {
                    setOptionState({
                      ...optionState,
                      countdown: !optionState.countdown
                    });
                    docCookies.setItem("countdown", optionState.countdown ? "F" : "T");
                  }}>倒计时</Button>
                </Stack>
                <TextField id="playLengthTextField" label="播放时长（0 = 无限）" variant="standard"
                  className="chinese"
                  value={optionState.playbackTime} 
                  onChange={(event) => setOptionState({
                    ...optionState,
                    playbackTime: parseFloat(event.target.value)
                  })}
                  type="number"
                  sx={{
                    width: "clamp(150px, 30%, 240px)"
                  }}
                  inputProps={{min: 0.05, max: 10, step: 0.05}}
                />
              </Stack>
            </BoxPaper>
          </TransitionTab>
          <TransitionTab index={1} value={tabValue}><BoxPaper padding={0}>
            <Box paddingTop={1} width="100%"></Box>
            <PlayControls
              onPreviousClick={onPreviousMusicClick}
              onNextClick={onNextMusicClick}
              onPauseClick={onPauseMusicClick}
              globalState={globalState}
            ></PlayControls>
            <PlaySlider 
              globalState={globalState}
              globalRefs={globalRefs}
            ></PlaySlider>
            <PlayList 
              data={data} musicPlayerState={musicPlayerState} globalMethods={globalMethods}
              listStyles={{
                marginTop: "0.5em"
              }}
            ></PlayList>
          </BoxPaper></TransitionTab>
          <TransitionTab index={2} value={tabValue}><BoxPaper>
            {memoizedMusicIdSelectPanel}
          </BoxPaper></TransitionTab>
          <TransitionTab index={3} value={tabValue}><Box width="100%">
            {isSmallScreen ? <Paper width="100%" padding={2}><Box padding={2}><Typography>
              Your screen is too small to display the game simulator. <br/>Please use a larger screen.
            </Typography></Box></Paper> : <GameSimulatorPanel 
              renderContents={renderGameSimulatorPanel}
              globalState={globalState} globalMethods={globalMethods}
              data={data}
            ></GameSimulatorPanel>}
          </Box></TransitionTab>
        </Box>


      </Box>
    </Box>}
  </ThemeProvider>

}