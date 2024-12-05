import {
  List, ListItem, Button, Box, Stack, Typography, IconButton, Slider
} from "@mui/material";
import {
  SkipNextRounded as RightIcon,
  SkipPreviousRounded as LeftIcon,
  PauseRounded as PauseIcon,
  PlayArrowRounded as PlayIcon,
} from "@mui/icons-material";
import { useState, useRef, useEffect } from "react";
import CachedAudioPlayer from "./cachedAudioPlayer";
import CardComponent from "./cardComponent";
import { forwardRef } from "react";
import TransitionTab from "./transitionTab";
import * as utils from "./utils";
import { useTheme } from "@mui/material/styles";

const ProminentCardGroup = forwardRef(({ 
  data, character, isFocused,
  musicFilename,
  globalSettingState,
}, ref) => {
  let filenames = data["data"][character]["card"]
  if (typeof filenames === "string") {
    filenames = [filenames];
  }
  filenames = filenames.map((filename) => {
    return globalSettingState.relativeRoot + globalSettingState.cardPrefix + filename;
  });
  const [musicName, albumName] = utils.getMusicName(musicFilename);
  return <Box 
    ref={ref}
    sx={{
      align: "center",
      alignItems: "center",
      flexShrink: 0,
      width: "clamp(0px, 100%, 720px)",
    }}
  >
    <Stack direction="column" spacing={2} paddingTop={1}>
      <Stack direction="column" spacing={0}>
      <Typography sx={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "clamp(1em, 1.5em, 3vw)"}}>{musicName}</Typography>
      <Typography sx={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "clamp(0.8em, 1.2em, 2.4vw)"}}>{albumName}</Typography>
      <Typography sx={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "clamp(0.8em, 1.2em, 2.4vw)"}}>{character}</Typography>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent={"center"}>
        {filenames.map((filename, index) => {
          return <CardComponent 
            key={index} src={filename} width="30%" elevation={6}
            paperStyles={{
              marginLeft: index === 0 ? "0%" : (isFocused ? "1%" : "-20%"),
              zIndex: filenames.length - index,
              transition: "margin-left 0.6s",
              transitionDelay: "0.4s"
            }}
          />
        })}
      </Stack>
    </Stack>
  </Box>
})
ProminentCardGroup.displayName = "ProminentCardGroup"

const QueueCardGroup = forwardRef(({ 
  data, musicPlayerState, containerWidthPixels,
  globalSettingState, globalControlMethods,
}, ref) => {
  const [hoveredCharacter, setHoveredCharacter] = useState(null);
  const singleInterval = 0.9;
  const pluralInterval = 0.4;
  const cardWidthRatio = 0.167;
  let cardWidth = containerWidthPixels * cardWidthRatio;
  if (cardWidth > 150) {cardWidth = 150;}
  const pluralMarginLeft = cardWidth * (1 - pluralInterval);
  const singleMarginLeft = cardWidth * (1 - singleInterval);
  const pastDisplacement = 0.5 * cardWidth;
  let playOrder = musicPlayerState.playOrder;
  let currentCharacter = musicPlayerState.currentPlaying;
  let currentCharacterIndex = playOrder.indexOf(currentCharacter);
  let queueItems = [];
  let totalFilenames = [];
  let displacement = singleMarginLeft;
  let flag = false;
  let totalCardCount = 0;
  for (let i = 0; i < playOrder.length; i++) {
    let character = playOrder[i];
    let filenames = data["data"][character]["card"]
    if (typeof filenames === "string") {
      filenames = [filenames];
    }
    filenames = filenames.map((filename) => {
      return globalSettingState.relativeRoot + globalSettingState.cardPrefix + filename;
    });
    const width = cardWidth * (1 + (filenames.length - 1) * pluralInterval);
    totalFilenames.push(filenames)
    if (!flag) {
      displacement -= width - singleMarginLeft;
    }
    if (character === currentCharacter) {
      flag = true;
    }
    totalCardCount += filenames.length;
  }
  flag = false;
  for (let i = 0; i < playOrder.length; i++) {
    let character = playOrder[i];
    let filenames = totalFilenames[i];
    const width = cardWidth * (1 + (filenames.length - 1) * pluralInterval);
    let cardDisplacement = displacement;
    if (!flag) cardDisplacement -= pastDisplacement;
    if (character === currentCharacter) {
      flag = true;
    }
    queueItems.push(<Box 
      ref={ref}
      sx={{
        align: "center",
        alignItems: "center",
        flexShrink: 0,
        width: width + "px",
        position: "relative",
        transition: "transform 0.5s",
        transform: `translateX(${cardDisplacement}px)`,
        marginLeft: "-" + singleMarginLeft + "px",
        zIndex: totalCardCount,
      }}
      onClick={() => {
        globalControlMethods.setTemporarySkip(character);
        console.log("click", character)
      }}
      onMouseOver={() => {
        setHoveredCharacter(character);
      }}
    >
      <Stack direction="row" spacing={0} alignItems="center" justifyContent={"center"}>
        {filenames.map((filename, index) => {
          totalCardCount -= 1;
          return <CardComponent 
            key={index} src={filename} width={cardWidth + "px"} elevation={6}
            paperStyles={{
              marginLeft: index === 0 ? "0%" : ("-" + pluralMarginLeft + "px"),
              zIndex: filenames.length - 1 - index,
              backgroundColor: (
                character == hoveredCharacter ?
                  (musicPlayerState.temporarySkip[character] ? "#DAEBEB" : "lightcyan") :
                  (musicPlayerState.temporarySkip[character] ? "lightgray" : "white")
              )
            }}
            imageStyles={{
              filter: musicPlayerState.temporarySkip[character] ? "grayscale(100%)" : "none"
            }}
          ></CardComponent>
        })}
      </Stack>
    </Box>);
  }
  return <Box sx={{
    display: "flex",
    flexWrap: "nowrap",
    overflow: "hidden",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    width: "100%",
  }} onMouseLeave={() => {
    setHoveredCharacter(null)
  }}>
    {queueItems}
  </Box>
})
QueueCardGroup.displayName = "QueueCardGroup"

export default function MusicPlayerPanel({
  data, musicPlayerState, globalSettingState, onNextClick = () => {}, onPreviousClick = () => {},
  exposeMethods, globalControlMethods
}) {

  const theme = useTheme();
  const prominentCardGroupContainerRef = useRef(null);
  const prominentCardGroupFirstItemRef = useRef(null);
  const [layoutInfo, updateLayoutInfo] = useState({
    containerWidth: 0,
    containerHeight: 0,
    itemWidth: 0,
    itemHeight: 0,
  });
  const [paused, setPaused] = useState(true);
  const [playbackPaused, setPlaybackPaused] = useState(false);
  const [audioState, setAudioState] = useState({
    currentTime: 0,
    duration: 0,
  });
  const audioCountdownRef = useRef(null);
  const isPlayingCountdown = musicPlayerState.playingCountdownTimeout !== null;
  
  useEffect(() => {
    const handleResize = () => {
      let updater = {}
      if (prominentCardGroupContainerRef.current) {
        updater = {
          ...updater,
          containerHeight: prominentCardGroupContainerRef.current.clientHeight,
          containerWidth: prominentCardGroupContainerRef.current.clientWidth,
        }
      }
      if (prominentCardGroupFirstItemRef.current) {
        updater = {
          ...updater,
          itemHeight: prominentCardGroupFirstItemRef.current.clientHeight,
          itemWidth: prominentCardGroupFirstItemRef.current.clientWidth,
        }
      }
      updateLayoutInfo({
        ...layoutInfo,
        ...updater
      });
    };
  
    window.addEventListener('resize', handleResize);
    handleResize(); // Call the function initially to set the layout
  
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [layoutInfo])

  let dataCharacters = data["data"];

  function getMusicNameOfCharacter(character) {
    let musicList = dataCharacters[character]["music"];
    if (typeof musicList === "string") {
      musicList = [musicList];
    }
    return musicList[0];
  }

  let currentCharacter = musicPlayerState.currentPlaying;
  let currentSource = data["sources"][getMusicNameOfCharacter(currentCharacter)];
  let playOrder = musicPlayerState.playOrder;
  let currentIndexInPlayOrder = playOrder.indexOf(currentCharacter);
  let nextIndexInPlayOrder = (currentIndexInPlayOrder + 1) % playOrder.length;
  let nextCharacter = playOrder[nextIndexInPlayOrder];
  let nextSource = data["sources"][getMusicNameOfCharacter(nextCharacter)];
  let previousIndexInPlayOrder = (currentIndexInPlayOrder - 1 + playOrder.length) % playOrder.length;
  let previousCharacter = playOrder[previousIndexInPlayOrder];

  let [audioPlayer, prepareAudio, audioRef] = CachedAudioPlayer({ src: currentSource, onFetched: (src, audioRef) => {
    if (src === currentSource) {
      if (!paused) {
        audioRef.current.play().catch((e) => {
          console.log("Failed to play", e);
        });
      }
    }
  }, onLoaded: (audioRef) => {
    let position = 0;
    if (globalSettingState.randomPlayPosition) {
      position = Math.random() * Math.max(audioRef.current.duration - 10, 0);
    }
    setAudioState({
      currentTime: position,
      duration: audioRef.current.duration,
    });
    audioRef.current.currentTime = position;
  }});
  prepareAudio(nextSource);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener("timeupdate", () => {
        setAudioState({
          currentTime: audioRef.current.currentTime,
          duration: audioRef.current.duration,
        });
      });
    }
  }, [audioRef]);

  useEffect(() => {
    if (isPlayingCountdown) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } 
    // else {
    //   if (audioRef.current && !paused) {
    //     audioRef.current.play().catch((e) => {
    //       console.log("Failed to play", e);
    //     });
    //   }
    // }
  }, [isPlayingCountdown, audioRef]);

  let switchSongButtonSize = layoutInfo.containerWidth * 0.125;
  let switchSongButtonTop = layoutInfo.containerHeight * 0.5 - switchSongButtonSize / 2;
  let switchSongButtonXDisplacement = layoutInfo.itemWidth / 2;
  let prevSongButtonLeft = layoutInfo.containerWidth / 2 - switchSongButtonXDisplacement - switchSongButtonSize;
  let nextSongButtonLeft = layoutInfo.containerWidth / 2 + switchSongButtonXDisplacement;

  const toMinuteSeconds = function(t) {
    if (isNaN(t)) {
      return "0:00";
    }
    let minutes = Math.floor(t / 60);
    let seconds = Math.floor(t % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }

  
  useEffect(() => {
    const exposedMethods = {
      pause: () => {
        setPaused(true);
        if (audioRef.current) {
          audioRef.current.pause();
        }
      },
      playCountdown: () => {
        if (audioCountdownRef.current) {
          audioCountdownRef.current.play().catch((e) => {
            console.log("Failed to play", e);
          });
        }
      },
      playbackPause: () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setPlaybackPaused(true);
        }
      },
      setPlaybackPaused: (v) => {
        setPlaybackPaused(v);
      }
    }
    if (exposeMethods) {
      exposeMethods.current = exposedMethods;
    }
  }, [exposeMethods, audioRef]);

  return <Stack spacing={1} align="center" alignItems="center">
    <Box width="100%" align="center" alignItems="center">
      <Box sx={{
        display: "flex",
        flexWrap: "nowrap",
      }} ref={prominentCardGroupContainerRef}
      >
        {/* <Box sx={{
          width: 0,
          height: 0,
          position: "relative",
          zIndex: playOrder.length + 1,
        }}>
          <IconButton onClick={onPreviousClick} variant="outlined" color="primary" disabled={isPlayingCountdown}
            sx={{
              position: "absolute",
              top: switchSongButtonTop,
              left: prevSongButtonLeft,
              height: switchSongButtonSize,
              width: switchSongButtonSize,
              minWidth: switchSongButtonSize,
            }}
          >
            <LeftIcon sx={{
              fontSize: layoutInfo.containerHeight * 0.2,
            }}></LeftIcon>
          </IconButton>
          <IconButton onClick={onNextClick} variant="outlined" color="primary" disabled={isPlayingCountdown}
            sx={{
              position: "absolute",
              top: switchSongButtonTop,
              left: nextSongButtonLeft,
              height: switchSongButtonSize,
              width: switchSongButtonSize,
              minWidth: switchSongButtonSize,
            }}
          >
            <RightIcon sx={{
              fontSize: layoutInfo.containerHeight * 0.2,
            }}></RightIcon>
          </IconButton>
        </Box> */}
        {playOrder.map((character, index) => {
          return <TransitionTab key={index} index={index} value={currentIndexInPlayOrder}>
            <ProminentCardGroup 
              data={data} character={character} 
              globalSettingState={globalSettingState} 
              musicFilename={utils.getMusicFilename(data, character, musicPlayerState)}
              isFocused={index === currentIndexInPlayOrder}
              ref={index === 0 ? prominentCardGroupFirstItemRef : null}
            />
          </TransitionTab>
        })}
      </Box>
    </Box>
    <Stack direction="row" spacing={2} alignItems="center" justifyContent={"center"} width={"100%"}>
      <Typography style={{fontFamily: "monospace"}}>
        {toMinuteSeconds(audioState.currentTime)}
      </Typography>
      <Slider sx={{
        width: "clamp(0px, 25%, 240px)"
      }}
        value={audioState.currentTime} 
        max={audioState.duration}
        onChange={(e, newValue) => {
          if (isNaN(newValue)) {
            console.log("NaN")
            return;
          }
          if (audioRef.current) {
            audioRef.current.currentTime = newValue;
          }
        }}
      >
      </Slider>
      <Typography style={{fontFamily: "monospace"}}>
        {toMinuteSeconds(audioState.duration)}
      </Typography>
    </Stack>
    <Stack direction="row" spacing={2} alignItems="center" justifyContent={"center"}> 
      <IconButton onClick={onPreviousClick} variant="outlined" color="primary" disabled={isPlayingCountdown} size="large">
        <LeftIcon fontSize="large"></LeftIcon>
      </IconButton>
      <IconButton disabled={isPlayingCountdown} onClick={() => {
        if (!playbackPaused) setPaused(!paused);
        setPlaybackPaused(false);
        if (audioRef.current) {
          if (paused || playbackPaused) {
            audioRef.current.play().catch((e) => {
              console.log("Failed to play", e);
            });
          } else {
            audioRef.current.pause();
          }
        }
      }} variant="outlined" color="primary" size="large"
      >
        {(paused || playbackPaused) ? <PlayIcon
            fontSize="large"
          ></PlayIcon> : <PauseIcon
            fontSize="large"
          ></PauseIcon>
        }
      </IconButton>
      <IconButton onClick={onNextClick} variant="outlined" color="primary" disabled={isPlayingCountdown} size="large">
        <RightIcon fontSize="large"></RightIcon>
      </IconButton>
    </Stack>
    
    {audioPlayer}
    <audio ref={audioCountdownRef} src="../Bell3.mp3"></audio>
      
    <Box align="left" width="100%" >
      <Typography className="chinese">队列中 (单击可选择将其跳过)</Typography>
    </Box>
    <QueueCardGroup 
      data={data}
      globalSettingState={globalSettingState} 
      musicPlayerState={musicPlayerState}
      containerWidthPixels={layoutInfo.containerWidth}
      globalControlMethods={globalControlMethods}
    />

  </Stack>

}