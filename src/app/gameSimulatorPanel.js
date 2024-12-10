import {
  List, ListItem, Button, Typography, IconButton, Box, Paper, Stack, Slider, TextField
} from "@mui/material";
import { useState, useEffect, useRef } from "react";
import CardComponent from "./cardComponent";
import {
  East as DeckLargerIcon,
  West as DeckSmallerIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  AccessibleForward as OpponentIcon,
  Shuffle as ShuffleIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Loop as TraditionalIcon,
  FilterAlt as FilterOnIcon,
  FilterAltOff as FilterOffIcon,
} from "@mui/icons-material";
import { PlayControls } from "./playControls";
import docCookies from "./docCookies";
import { cardGlitchTransform } from "./utils";

const clClamp = (v, cl) => {
  if (v > cl.max) return cl.max;
  if (v < cl.min) return cl.min;
  return v;
}
const CL = {
  deckCanvasRatio: {max: 0.9, min: 0.4, interval: 0.025},
  deckWidth: {max: 15, min: 3},
  deckHeight: {max: 5, min: 1},
  // opponentEnabled
  opponentTimeAverage: {max: 20, min: 1, step: 0.5},
  opponentTimeDeviation: {max: 10, min: 0, step: 0.5},
  opponentMistakeRate: {min: 0, max: 1, step: 0.1},
  // traditionalMode
}

function CardPlaceholder() {
  return <CardComponent
    noImage
    width="100%"
    paperStyles={{
      backgroundColor: "transparent",
      border: "2px dashed gray",
    }}
  ></CardComponent>
}
function TimerDisplay({ roundInfo, updating, sx={} }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = !updating ? null : setInterval(() => {
      setNow(Date.now());
    }, 10); // Update every 10 milliseconds

    return () => {
      clearInterval(interval);
    }
  }, [updating]);

  let time = "";
  if (roundInfo.startTimestamp > 0 && roundInfo.foundBy !== 0) {
    time = roundInfo.foundTimestamp - roundInfo.startTimestamp
  } else {
    time = now - roundInfo.startTimestamp
  }
  if (time < 0) {
    time = 0;
  }
  time = (time / 1000).toFixed(2) + "s";

  return <Typography sx={sx}>{time}</Typography>;
}

const GameSimulatorPanel = ({ renderContents, data, globalState, globalMethods }) => {

  let canvasRef = useRef(null);

  const [layoutInfo, rawSetLayoutInfo] = useState({
    canvasWidth: 0,
    canvasHeight: 0,
    deckWidth: 8,
    deckHeight: 3,
    deckCanvasRatio: 0.7,
    hasOpponent: false,
  });
  const [sliderValue, setSliderValue] = useState(0);
  const [deckInfo, setDeckInfo] = useState({
    // elements inside should be [character: str, cardId: int] or null
    playerDeck: Array(layoutInfo.deckWidth * layoutInfo.deckHeight).fill(null),
    opponentDeck: Array(layoutInfo.deckWidth * layoutInfo.deckHeight).fill(null),
  });
  const [gameInfo, setGameInfo] = useState({
    gameStarted: false,
    playerObtained: [],
    opponentObtained: [],
  });
  const [roundInfo, setRoundInfo] = useState({
    startTimestamp: 0,
    foundTimestamp: 0,
    opponentTimeoutSet: false,
    opponentTimeout: null,
    opponentMistaken: [],
    playerMistaken: [],
    foundBy: 0,
  })
  const [opponentSettings, setOpponentSettings] = useState({
    timeAverage: 8,
    timeDeviation: 3,
    mistakeRate: 0.1,
    traditionalMode: true,
  });
  const [filterUnselectedMusic, setFilterUnselectedMusic] = useState(false);
  const [timingStats, setTimingStats] = useState({
    "allAccumulateTime": 0,
    "correctAccumulateTime": 0,
    "allClicks": 0,
    "correctClicks": 0,
  })

  const timeoutReadRef = useRef(null);
  
  useEffect(() => {
    timeoutReadRef.current = {
      layoutInfo: layoutInfo,
      deckInfo: deckInfo,
      gameInfo: gameInfo,
      roundInfo: roundInfo,
      opponentSettings: opponentSettings,
      globalState: globalState,
    }
  });
  
  function setLayoutInfo(newLayoutInfo) {
    const cardCount = newLayoutInfo.deckWidth * newLayoutInfo.deckHeight;
    let deckInfo = timeoutReadRef.current.deckInfo; 
    const needUpdateDeckInfo = (
      cardCount !== deckInfo.playerDeck.length ||
      (newLayoutInfo.hasOpponent && cardCount !== deckInfo.opponentDeck.length) ||
      (!newLayoutInfo.hasOpponent && deckInfo.opponentDeck.length > 0)
    )
    if (needUpdateDeckInfo) {
      let newPlayerDeck = deckInfo.playerDeck.slice();
      if (newPlayerDeck.length > cardCount) {
        newPlayerDeck = newPlayerDeck.slice(0, cardCount);
      }
      while (newPlayerDeck.length < cardCount) {
        newPlayerDeck.push(null);
      }
      let newOpponentDeck = [];
      if (newLayoutInfo.hasOpponent) {
        newOpponentDeck = deckInfo.opponentDeck.slice();
        if (newOpponentDeck.length > cardCount) {
          newOpponentDeck = newOpponentDeck.slice(0, cardCount);
        }
        while (newOpponentDeck.length < cardCount) {
          newOpponentDeck.push(null);
        }
      }
      const newDeckInfo = {
        playerDeck: newPlayerDeck,
        opponentDeck: newOpponentDeck,
      }
      setDeckInfo(newDeckInfo);
    }
    rawSetLayoutInfo(newLayoutInfo);
  }

  // load cookies
  useEffect(() => {
    // deckCanvasRatio, deckWidth, deckHeight, hasOpponent is for layoutInfo
    let additional = {};
    {
      let loaded = {};

      let c = docCookies.getItem("deckCanvasRatio");
      if (c !== null) {
        c = parseFloat(c);
        if (c >= CL.deckCanvasRatio.min && c <= CL.deckCanvasRatio.max) {
          loaded["deckCanvasRatio"] = c;
        } else {
          docCookies.removeItem("deckCanvasRatio");
        }
      }

      c = docCookies.getItem("deckWidth");
      if (c !== null) {
        c = parseInt(c);
        if (c >= CL.deckWidth.min && c <= CL.deckWidth.max) {
          loaded["deckWidth"] = c;
        } else {
          docCookies.removeItem("deckWidth");
        }
      }

      c = docCookies.getItem("deckHeight");
      if (c !== null) {
        c = parseInt(c);
        if (c >= CL.deckHeight.min && c <= CL.deckHeight.max) {
          loaded["deckHeight"] = c;
        } else {
          docCookies.removeItem("deckHeight");
        }
      }

      c = docCookies.getItem("hasOpponent");
      if (c !== null) {
        if (c == "T") {
          loaded["hasOpponent"] = true;
        } else if (c == "F") {
          loaded["hasOpponent"] = false;
        } else {
          docCookies.removeItem("hasOpponent");
        }
      }

      if (Object.keys(loaded).length > 0) {
        additional = loaded;
      }
    }

    // opponentTimeAverage, opponentTimeDeviation, opponentMistakeRate, traditionalMode is for opponentSettings
    {
      let loaded = {};

      let c = docCookies.getItem("opponentTimeAverage");
      if (c !== null) {
        c = parseFloat(c);
        if (c >= CL.opponentTimeAverage.min && c <= CL.opponentTimeAverage.max) {
          loaded["timeAverage"] = c;
        } else {
          docCookies.removeItem("opponentTimeAverage");
        }
      }

      c = docCookies.getItem("opponentTimeDeviation");
      if (c !== null) {
        c = parseFloat(c);
        if (c >= CL.opponentTimeDeviation.min && c <= CL.opponentTimeDeviation.max) {
          loaded["timeDeviation"] = c;
        } else {
          docCookies.removeItem("opponentTimeDeviation");
        }
      }

      c = docCookies.getItem("opponentMistakeRate");
      if (c !== null) {
        c = parseFloat(c);
        if (c >= CL.opponentMistakeRate.min && c <= CL.opponentMistakeRate.max) {
          loaded["mistakeRate"] = c;
        } else {
          docCookies.removeItem("opponentMistakeRate");
        }
      }

      c = docCookies.getItem("traditionalMode");
      if (c !== null) {
        if (c == "T") {
          loaded["traditionalMode"] = true;
        } else if (c == "F") {
          loaded["traditionalMode"] = false;
        } else {
          docCookies.removeItem("traditionalMode");
        }
      }

      if (Object.keys(loaded).length > 0) {
        setOpponentSettings({
          ...opponentSettings,
          ...loaded,
        });
      }
    }

    const handleResize = (additional = {}) => {
      let updater = {}
      if (canvasRef.current) {
        updater = {
          ...updater,
          canvasWidth: canvasRef.current.clientHeight,
          canvasHeight: canvasRef.current.clientWidth,
        }
      }
      let flag = false;
      Object.keys(updater).forEach((key, index) => {
        if (layoutInfo[key] != updater[key]) {
          flag = true;
        }
      })
      if (flag) {
        setLayoutInfo({
          ...timeoutReadRef.current.layoutInfo,
          ...updater,
          ...additional
        });
      }
    };
  
    window.addEventListener('resize', handleResize);
    handleResize(additional); // Call the function initially to set the layout
  
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  function resetTimingStats() {
    setTimingStats({
      "allAccumulateTime": 0,
      "correctAccumulateTime": 0,
      "allClicks": 0,
      "correctClicks": 0,
    })
  }

  const optionState = globalState.optionState;
  const gameStarted = gameInfo.gameStarted;
  const hasOpponent = layoutInfo.hasOpponent;

  const canvasMargin = 16;
  const canvasSpacing = 6;
  const cards = {};
  const cardAspectRatio = 703 / 1000;
  const cardSpacing = canvasSpacing;
  const clientWidth = canvasRef.current ? canvasRef.current.clientWidth : 0;
  const canvasWidth = clientWidth;
  let cardWidth = 0;
  let deckLeft = 0;
  let deckWidthPixels = 0;
  if (canvasRef.current) {
    deckWidthPixels = canvasRef.current.clientWidth * layoutInfo.deckCanvasRatio;
    cardWidth = (deckWidthPixels - cardSpacing * (layoutInfo.deckWidth - 1)) / layoutInfo.deckWidth;
    if (cardWidth < 0) { cardWidth = 0; }
    deckLeft = (canvasRef.current.clientWidth - deckWidthPixels) / 2;
  }
  const cardHeight = cardWidth / cardAspectRatio;
  const sliderHeight = 28;
  const playControlsWidth = 209;
  const playControlsHeight = 59;
  let middlebandCardHeight = !gameStarted ? 0.8 * cardHeight : (playControlsHeight - canvasSpacing - sliderHeight) / 1.1;
  if (middlebandCardHeight < 0) { middlebandCardHeight = 0; }
  let middlebandHeight = middlebandCardHeight * (1 + 0.1) + sliderHeight + canvasSpacing;
  if (gameStarted) {
    middlebandHeight = playControlsHeight;
  }
  const opponentObtainedTop = canvasMargin;
  const opponentDeckTop = (!gameStarted || !hasOpponent) ? canvasMargin : (opponentObtainedTop + cardHeight + canvasSpacing);
  const opponentDeckBottom = opponentDeckTop + (!hasOpponent ? 0 : cardHeight * layoutInfo.deckHeight + cardSpacing * (layoutInfo.deckHeight - 1));
  let middlebandTop = opponentDeckBottom + (!hasOpponent ? 0 : canvasSpacing);
  const playerDeckTop = middlebandTop + middlebandHeight + canvasSpacing;
  const playerDeckBottom = playerDeckTop + cardHeight * layoutInfo.deckHeight + cardSpacing * (layoutInfo.deckHeight - 1);
  const playerObtainedTop = playerDeckBottom + canvasSpacing;
  let canvasHeight = !gameStarted ? playerDeckBottom + canvasMargin : playerObtainedTop + cardHeight + canvasMargin;
  const buttonSize = 24;
  if (!gameStarted) {
    canvasHeight += canvasSpacing + buttonSize;
  }
  const characterCount = Object.keys(data.data).length;

  if (!renderContents) {
    return <Box width="100%" padding={1}>
      <Paper 
        ref={canvasRef}
        variant="outlined"
        sx={{
          width: "100%",
          height: canvasHeight,
          position: "relative",
          overflow: "hidden",
          transition: "height 0.5s",
        }}
      >
        Placeholder text
      </Paper>
    </Box>
  }

  const characterExists = (character) => {
    if (character === null) return false;
    return globalState.musicPlayerState.musicIds[character] !== -1;
  }

  let playerDeckFilled = deckInfo.playerDeck.map((deckCard) => deckCard !== null && characterExists(deckCard[0]));
  let opponentDeckFilled = deckInfo.opponentDeck.map((deckCard) => deckCard !== null && characterExists(deckCard[0]));
  
  const opponentEnabledButtonLeft = deckLeft - buttonSize - canvasSpacing;
  const opponentEnabledButtonTop = hasOpponent ? opponentDeckBottom - buttonSize : playerDeckTop
  const opponentDeckFilledCount = opponentDeckFilled.filter((value) => value).length;
  const opponentDeckFull = opponentDeckFilledCount === deckInfo.opponentDeck.length;
  const opponentDeckEmpty = opponentDeckFilledCount === 0;
  const playerDeckFilledCount = playerDeckFilled.filter((value) => value).length;
  const playerDeckFull = playerDeckFilledCount === deckInfo.playerDeck.length;
  const playerDeckEmpty = playerDeckFilledCount === 0;

  let gameFinished = !gameStarted;
  const traditionalMode = opponentSettings.traditionalMode;
  if (gameStarted) {
    if (hasOpponent) {
      if (traditionalMode) {
        gameFinished = playerDeckEmpty || opponentDeckEmpty;
      } else {
        gameFinished = playerDeckEmpty && opponentDeckEmpty;
      }
    } else {
      gameFinished = playerDeckEmpty;
    }
  }

  // calculate card positioning and size infos
  let cardRenderInfos = {};
  let cardPlaceholderInfos = [];

  Object.entries(data.data).forEach(([character, characterData]) => {
    if (!characterExists(character)) {return;}
    let filenames = characterData["card"]
    if (typeof filenames === "string") {
      filenames = [filenames];
    }
    filenames = filenames.map((filename) => {
      return optionState.relativeRoot + optionState.cardPrefix + filename;
    });
    let characterCardInfos = [];
    filenames.forEach((filename, index) => {
      const cardRenderInfo = {
        shown: true,
        key: "card" + character + index,
        filename: filename,
        character: character,
        cardIndex: index,
        width: 0, // height is automatically calculated from width by aspect ratio
        left: 0,
        top: 0,
        reversed: false,
        zIndex: 0,
        props: {},
        boxStyles: {},
        paperStyles: {},
        imageStyles: {},
        backgroundColor: "white",
        grayscale: false,
        assigned: false,
        inDeck: false,
      }
      characterCardInfos.push(cardRenderInfo);
    });
    cardRenderInfos[character] = characterCardInfos;
  });

  deckInfo.playerDeck.forEach((deckCard, index) => {
    const left = deckLeft + (index % layoutInfo.deckWidth) * (cardWidth + cardSpacing);
    const top = playerDeckTop + Math.floor(index / layoutInfo.deckWidth) * (cardHeight + cardSpacing);
    if (deckCard == null || !characterExists(deckCard[0])) {
      if (!gameStarted) {
        cardPlaceholderInfos.push({
          key: "placeholder" + cardPlaceholderInfos.length,
          left, top, width: cardWidth, height: cardHeight,
        })
      }
    } else {
      const [character, cardIndex] = deckCard;
      if (!characterExists(character)) {return;}
      const cardRenderInfo = cardRenderInfos[character][cardIndex];
      cardRenderInfo.inDeck = true;
      cardRenderInfo.left = left;
      cardRenderInfo.top = top;
      cardRenderInfo.width = cardWidth;
      cardRenderInfo.assigned = true;
      cardRenderInfos[character].forEach((otherCard) => {
        if (otherCard.cardIndex !== cardIndex) {
          otherCard.left = left;
          otherCard.top = top;
          otherCard.width = cardWidth;
          otherCard.assigned = true;
        }
      });
      if (!gameStarted) {
        cardRenderInfo.props["onClick"] = () => {
          let newPlayerDeck = deckInfo.playerDeck.slice();
          newPlayerDeck[index] = null;
          setDeckInfo({
            ...deckInfo,
            playerDeck: newPlayerDeck,
          });
        }
      }
    }
  });

  if (layoutInfo.hasOpponent) {
    deckInfo.opponentDeck.forEach((deckCard, index) => {
      const left = deckLeft + (index % layoutInfo.deckWidth) * (cardWidth + cardSpacing);
      const top = opponentDeckTop + Math.floor(index / layoutInfo.deckWidth) * (cardHeight + cardSpacing);
      if (deckCard == null || !characterExists(deckCard[0])) {
        if (!gameStarted) {
          cardPlaceholderInfos.push({
            key: "placeholder" + cardPlaceholderInfos.length,
            left, top, width: cardWidth, height: cardHeight,
          })
        }
      } else {
        const [character, cardIndex] = deckCard;
        if (!characterExists(character)) {return;}
        const cardRenderInfo = cardRenderInfos[character][cardIndex];
        cardRenderInfo.inDeck = true;
        cardRenderInfo.left = left;
        cardRenderInfo.top = top;
        cardRenderInfo.width = cardWidth;
        cardRenderInfo.reversed = true;
        cardRenderInfo.assigned = true;
        cardRenderInfos[character].forEach((otherCard) => {
          if (otherCard.cardIndex !== cardIndex) {
            otherCard.left = left;
            otherCard.top = top;
            otherCard.width = cardWidth;
            otherCard.reversed = true;
            otherCard.assigned = true;
          }
        });
        if (!gameStarted) {
          cardRenderInfo.props["onClick"] = () => {
            let newOpponentDeck = deckInfo.opponentDeck.slice();
            newOpponentDeck[index] = null;
            setDeckInfo({
              ...deckInfo,
              opponentDeck: newOpponentDeck,
            });
          }
        }
      }
    });
  }
  
  // for those in deck
  Object.entries(cardRenderInfos).forEach(([character, characterCardInfos]) => {
    characterCardInfos.forEach((cardRenderInfo) => {
      if (!cardRenderInfo.inDeck) {return;}
      // backcolor
      if (!gameStarted) {
        cardRenderInfo.paperStyles["&:hover"] = {
          backgroundColor: "lightcyan",
        }
      } else {
        if (roundInfo.opponentMistaken.includes(character) || roundInfo.playerMistaken.includes(character)) {
          cardRenderInfo.backgroundColor = "lightsalmon";
        } else if (roundInfo.foundBy !== 0 && character === globalState.musicPlayerState.currentPlaying) {
          cardRenderInfo.backgroundColor = "lightgreen";
        } else if (!gameFinished && roundInfo.foundBy === 0) {
          cardRenderInfo.paperStyles["&:hover"] = {
            backgroundColor: "lightcyan",
          }
        }
      }
      // onclick when game has started
      if (gameStarted) {
        cardRenderInfo.props["onClick"] = () => {
          if (roundInfo.foundBy !== 0) {
            return;
          }
          if (gameFinished) {
            return;
          }
          if (roundInfo.opponentMistaken.includes(character) || roundInfo.playerMistaken.includes(character)) {return;}
          if (character === globalState.musicPlayerState.currentPlaying) {
            setRoundInfo({
              ...roundInfo,
              foundTimestamp: Date.now(),
              foundBy: 1,
            });
            setTimingStats({
              ...timingStats,
              "correctClicks": timingStats.correctClicks + 1,
              "correctAccumulateTime": timingStats.correctAccumulateTime + (Date.now() - roundInfo.startTimestamp),
              "allClicks": timingStats.allClicks + 1,
              "allAccumulateTime": timingStats.allAccumulateTime + (Date.now() - roundInfo.startTimestamp),
            })
          } else {
            let newPlayerMistaken = roundInfo.playerMistaken.slice();
            newPlayerMistaken.push(character);
            setRoundInfo({
              ...roundInfo,
              playerMistaken: newPlayerMistaken,
            });
            setTimingStats({
              ...timingStats,
              "allClicks": timingStats.allClicks + 1,
              "allAccumulateTime": timingStats.allAccumulateTime + (Date.now() - roundInfo.startTimestamp),
            })
          }
        }
      }
      cardRenderInfo.zIndex = 1; // for those with the same character but not same cardIndex, zIndex = 0 so that it is hidden
    });
  });

  // for obtained
  const playerObtained = gameInfo.playerObtained.filter((card) => characterExists(card[0]));
  const opponentObtained = gameInfo.opponentObtained.filter((card) => characterExists(card[0]));
  if (gameStarted) {
    const availableWidth = canvasWidth - 2 * canvasMargin - cardWidth - canvasSpacing;
    const defaultObtainedOverlapRatio = 0.6;
    {
      let obtainedOverlap = cardWidth * defaultObtainedOverlapRatio;
      const requiredWidth = ((playerObtained.length > 0) 
        ? cardWidth * playerObtained.length - obtainedOverlap * (playerObtained.length - 1)
        : 0
      );
      if (playerObtained.length > 1 && requiredWidth > availableWidth) {
        obtainedOverlap = (cardWidth * playerObtained.length - availableWidth) / (playerObtained.length - 1);
      }
      const offset = canvasWidth - canvasMargin - cardWidth * 2 - canvasSpacing;
      for (let i = playerObtained.length - 1; i >= 0; i--) {
        let character = playerObtained[i][0];
        let cardIndex = playerObtained[i][1];
        cardRenderInfos[character].forEach((cardRenderInfo, index) => {
          cardRenderInfo.left = offset - (playerObtained.length - 1 - i) * (cardWidth - obtainedOverlap);
          cardRenderInfo.top = playerObtainedTop;
          cardRenderInfo.width = cardWidth;
          cardRenderInfo.zIndex = index === cardIndex ? i + 1 : 0;
          cardRenderInfo.assigned = true;
          if (index === cardIndex) {
            cardRenderInfo.boxStyles["&:hover"] = {
              zIndex: 100,
            };
            cardRenderInfo.paperStyles["&:hover"] = {
              backgroundColor: "lightcyan",
            };
          }
        });
      }
    }
    if (hasOpponent) {
      let obtainedOverlap = cardWidth * defaultObtainedOverlapRatio;
      const requiredWidth = ((opponentObtained.length > 0) 
        ? cardWidth * opponentObtained.length - obtainedOverlap * (opponentObtained.length - 1)
        : 0
      );
      if (opponentObtained.length > 1 && requiredWidth > availableWidth) {
        obtainedOverlap = (cardWidth * opponentObtained.length - availableWidth) / (opponentObtained.length - 1);
      }
      const offset = canvasMargin + canvasSpacing + cardWidth;
      for (let i = opponentObtained.length - 1; i >= 0; i--) {
        let character = opponentObtained[i][0];
        let cardIndex = opponentObtained[i][1];
        cardRenderInfos[character].forEach((cardRenderInfo, index) => {
          cardRenderInfo.left = offset + (opponentObtained.length - 1 - i) * (cardWidth - obtainedOverlap);
          cardRenderInfo.top = opponentObtainedTop;
          cardRenderInfo.width = cardWidth;
          cardRenderInfo.zIndex = index === cardIndex ? i + 1 : 0;
          cardRenderInfo.reversed = true;
          cardRenderInfo.assigned = true;
          if (index === cardIndex) {
            cardRenderInfo.boxStyles["&:hover"] = {
              zIndex: 100,
            };
            cardRenderInfo.paperStyles["&:hover"] = {
              backgroundColor: "lightcyan",
            };
          }
        });
      }
    }
  }

  // for those not assigned
  if (!gameStarted) { // the cards are placed in the middleband to be selected
    let counter = 0;
    const cardHeight = middlebandCardHeight;
    const cardWidth = cardHeight * cardAspectRatio;
    const cardOverlap = cardWidth * 0.35;
    const canSelectMoreCards = playerDeckFilled.includes(false) || (layoutInfo.hasOpponent && opponentDeckFilled.includes(false));
    Object.entries(cardRenderInfos).forEach(([character, characterCardInfos]) => {
      characterCardInfos.forEach((cardRenderInfo) => {
        if (!cardRenderInfo.assigned) {
          cardRenderInfo.left = deckLeft + counter * (cardWidth - cardOverlap);
          cardRenderInfo.top = middlebandTop + cardHeight * 0.1;
          cardRenderInfo.width = cardWidth;
          if (canSelectMoreCards) {cardRenderInfo.props["onClick"] = () => {
            // if playerDeck has null value, assign the card to it; or if opponentDeck has null value, assign the card to it
            let index = playerDeckFilled.indexOf(false);
            if (index >= 0) {
              let newPlayerDeck = deckInfo.playerDeck.slice();
              newPlayerDeck[index] = [character, cardRenderInfo.cardIndex];
              setDeckInfo({
                ...deckInfo,
                playerDeck: newPlayerDeck,
              });
            } else if (layoutInfo.hasOpponent) {
              let index = opponentDeckFilled.indexOf(false);
              if (index >= 0) {
                let newOpponentDeck = deckInfo.opponentDeck.slice();
                newOpponentDeck[index] = [character, cardRenderInfo.cardIndex];
                setDeckInfo({
                  ...deckInfo,
                  opponentDeck: newOpponentDeck,
                });
              }
            }
          }}
          if (!canSelectMoreCards) {
            cardRenderInfo.backgroundColor = "lightgray";
            cardRenderInfo.grayscale = true;
          } else {
            cardRenderInfo.paperStyles["&:hover"] = {
              backgroundColor: "lightcyan",
              transform: "translateY(-10%)",
            }
          }
          counter++;
        }
      });
    });
    let displacement = 0;
    if (counter > 0) {
      let totalStretch = (counter - 1) * (cardWidth - cardOverlap) - (deckWidthPixels - cardWidth);
      if (totalStretch < 0) { totalStretch = 0; }
      displacement = totalStretch * sliderValue / 100;
    }
    let zIndexCounter = counter;
    Object.entries(cardRenderInfos).forEach(([character, characterCardInfos]) => {
      characterCardInfos.forEach((cardRenderInfo) => {
        if (!cardRenderInfo.assigned) {
          cardRenderInfo.left -= displacement;
          cardRenderInfo.zIndex = zIndexCounter;
          zIndexCounter--;
          cardRenderInfo.assigned = true;
        }
      });
    });
  } else {
    const cardHeight = middlebandCardHeight;
    const cardWidth = cardHeight * cardAspectRatio;
    let counter = 0;
    Object.entries(cardRenderInfos).forEach(([character, characterCardInfos]) => {
      characterCardInfos.forEach((cardRenderInfo) => {
        if (!cardRenderInfo.assigned) {
          cardRenderInfo.top = opponentDeckBottom + (hasOpponent ? canvasSpacing : 0) + cardHeight * 0.1;  
          cardRenderInfo.width = cardWidth;
          cardRenderInfo.backgroundColor = "lightgray";
          cardRenderInfo.grayscale = true;
          counter++;
        }
      });
    });
    // set zIndex descendingly
    let zIndexCounter = counter;
    Object.entries(cardRenderInfos).forEach(([character, characterCardInfos]) => {
      characterCardInfos.forEach((cardRenderInfo) => {
        if (!cardRenderInfo.assigned) {
          cardRenderInfo.zIndex = zIndexCounter;
          cardRenderInfo.left = -cardWidth * zIndexCounter + canvasSpacing * (zIndexCounter - 1);
          zIndexCounter--;
          cardRenderInfo.assigned = true;
        }
      });
    });
  }

  // for the slider
  let slider = null;
  {
    const sliderTop = middlebandTop + middlebandCardHeight * 1.1 + canvasSpacing;
    slider = <Slider 
      key="slider"
      size="small" sx={{
        width: deckWidthPixels - 20,
        top: sliderTop,
        left: !gameStarted ? deckLeft + 10 : (20 - canvasSpacing - deckWidthPixels),
        position: "absolute",
        transition: "top 0.5s, left 0.5s, width 0.5s",
      }}
      value={sliderValue}
      min={0}
      max={100}
      onChange={(e, newValue) => { // onChangeCommitted
        setSliderValue(newValue);
      }}
    ></Slider>
  }

  let renderedCards = [];
  cardPlaceholderInfos.forEach((cardInfo) => {
    renderedCards.push(<Box
      key={cardInfo.key}
      sx={{
        width: cardInfo.width,
        height: cardInfo.width / cardAspectRatio,
        position: "absolute",
        left: cardInfo.left,
        top: cardInfo.top,
      }}
    >
      <CardPlaceholder></CardPlaceholder>
    </Box>)
  });
  Object.entries(cardRenderInfos).forEach(([character, cardInfos]) => {
    cardInfos.forEach((cardInfo, index) => {
      const glitchTransform = !optionState.glitch ? "" : cardGlitchTransform(optionState.loadTime, cardInfo.filename);
      if (cardInfo.paperStyles.transform) {
        cardInfo.paperStyles.transform += " " + glitchTransform;
      } else {
        cardInfo.paperStyles.transform = glitchTransform;
      }
      if (cardInfo.paperStyles["&:hover"]) {
        if (cardInfo.paperStyles["&:hover"].transform) {
          cardInfo.paperStyles["&:hover"].transform += " " + glitchTransform;
        } else {
          cardInfo.paperStyles["&:hover"].transform = glitchTransform;
        }
      }
      renderedCards.push(<Box
        key={cardInfo.key}
        sx={{
          width: cardInfo.width,
          height: cardInfo.width / cardAspectRatio,
          position: "absolute",
          left: cardInfo.left,
          top: cardInfo.top,
          zIndex: cardInfo.zIndex,
          transition: "top 0.5s, left 0.5s, width 0.5s, height 0.5s, transform 0.5s",
          transform: cardInfo.reversed ? "rotate(180deg)" : "rotate(0deg)",
          ...cardInfo.boxStyles,
        }}
        {...cardInfo.props}
      >
        <CardComponent src={cardInfo.filename}
          width="100%"
          elevation={3}
          paperStyles={{
            backgroundColor: cardInfo.backgroundColor,
            transition: "transform 0.5s",
            ...cardInfo.paperStyles,
          }}
          imageStyles={{
            filter: cardInfo.grayscale ? "grayscale(100%)" : "none",
            ...cardInfo.imageStyles
          }}
        ></CardComponent>
      </Box>);
    });
  })

  const iconButtonProperties = {
    boxStyle: {
      position: "absolute",
      transition: "top 0.5s, left 0.5s, background-color 0.5s",
      "&:hover": {
        backgroundColor: "primary.main",
      },
      height: buttonSize,
      width: buttonSize,
      borderRadius: buttonSize / 2,
      borderColor: "primary.main",
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      display: "flex",
      zIndex: 100,
    }
  };

  const textfieldHeight = 40;
  const textfieldWidth = 100;
  const textfieldStyles = {
    position: "absolute",
    transition: "top 0.5s, left 0.5s, background-color 0.5s",
    height: textfieldHeight,
    width: textfieldWidth,
  }
  
  function createButton(key, icon, x, y, click, disabled=false, color="primary", lower=false) {
    let boxStyle = {...iconButtonProperties.boxStyle, left: x, top: y, zIndex: lower ? 0 : 100};
    if (disabled) {
      boxStyle["backgroundColor"] = "#444444";
      boxStyle["borderColor"] = "lightgray";
      boxStyle["&:hover"] = null;
    } else {
      boxStyle["&:hover"] = {...iconButtonProperties.boxStyle["&:hover"], backgroundColor: color + ".main"};
      boxStyle["borderColor"] = color + ".main";
    }
    return <Box sx={boxStyle} onClick={disabled ? null : click} key={key}>
      {icon}
    </Box>
  }

  function createText(key, text, x, y, hidden=false, positionedWithRight=false, sx={}) {
    let w = 0;
    if (canvasRef.current) {
      w = canvasRef.current.clientWidth;
    }
    let texts = text;
    // if "\n" in text, split it into multiple lines
    if (text.includes("\n")) {
      let r = text.split("\n"); texts = [];
      for (let i = 0; i < r.length; i++) {
        if (i != 0) {
          texts.push(<br key={key + "-br-" + i} />);
        }
        texts.push(r[i]);
      }
    }
    return <Typography
      key={key}
      className="chinese"
      sx={{
        position: "absolute",
        left: positionedWithRight ? "auto" : x,
        right: positionedWithRight ? (w - x) : "auto",
        top: y,
        color: hidden ? "transparent" : "white",
        transition: "color 0.5s, top 0.5s, right 0.5s, left 0.5s, bottom 0.5s",
        ...sx,
      }}
    >
      {texts}
    </Typography>
  }

  function getSelectableCharacters() {
    let selectableCharacters = [];
    Object.entries(data.data).forEach(([character, characterData]) => {
      if (globalState.musicPlayerState.musicIds[character] === -1) return;
      let flag = false;
      for (let i = 0; i < deckInfo.playerDeck.length; i++) {
        if (deckInfo.playerDeck[i] && deckInfo.playerDeck[i][0] === character) {
          flag = true;
          break;
        }
      }
      if (flag) return;
      if (layoutInfo.hasOpponent) {
        for (let i = 0; i < deckInfo.opponentDeck.length; i++) {
          if (deckInfo.opponentDeck[i] && deckInfo.opponentDeck[i][0] === character) {
            flag = true;
            break;
          }
        }
        if (flag) return;
      }
      selectableCharacters.push(character);
    });
    return selectableCharacters;
  }


  function resetRoundInfo() {
    if (roundInfo.opponentTimeout) {
      clearTimeout(roundInfo.opponentTimeout);
    }
    setRoundInfo({
      startTimestamp: Date.now(),
      foundTimestamp: Date.now(),
      opponentTimeoutSet: false,
      opponentTimeout: null,
      opponentMistaken: [],
      playerMistaken: [],
      foundBy: 0, // 1: player, 2: opponent
    });
  }

  function randomizeOpponentClickTime() {
    const timeAverage = opponentSettings.timeAverage;
    const timeDeviation = opponentSettings.timeDeviation;
    let t = (timeAverage + Math.random() * timeDeviation * 2 - timeDeviation) * 1000;
    if (t < 10) { t = 10; }
    return t; // ms
  }

  function simulateOpponentClick() {
    if (!hasOpponent || !gameStarted) return;
    if (!timeoutReadRef.current) return;
    const { layoutInfo, deckInfo, gameInfo, roundInfo, opponentSettings, globalState } = timeoutReadRef.current;
    let gameFinished = false;
    let playerDeckFilledCount = deckInfo.playerDeck.filter((deckCard) => deckCard !== null).length;
    let playerDeckEmpty = playerDeckFilledCount === 0;
    let opponentDeckFilledCount = deckInfo.opponentDeck.filter((deckCard) => deckCard !== null).length;
    let opponentDeckEmpty = opponentDeckFilledCount === 0;
    if (opponentSettings.traditionalMode) {
      gameFinished = playerDeckEmpty || opponentDeckEmpty;
    } else {
      gameFinished = playerDeckEmpty && opponentDeckEmpty
    }
    if (gameFinished) {
      console.log("Opponent click: Game finished.");
      return;
    }
    if (roundInfo.foundBy === 1) {
      console.log("Opponent click: Player has already taken it.");
      return;
    }
    if (roundInfo.foundBy === 2) {
      console.log("Opponent click: Opponent has already taken it. Maybe some bug?");
      return;
    }
    let mistakeRate = opponentSettings.mistakeRate;
    {
      const cardsOnDeck = playerDeckFilledCount + opponentDeckFilledCount;
      const totalSlotsOnDeck = layoutInfo.deckWidth * layoutInfo.deckHeight * 2;
      mistakeRate *= cardsOnDeck / totalSlotsOnDeck;
    }
    const mistakeDiceRoll = Math.random();
    console.log("Opponent click: Mistake rate: " + mistakeRate + ", dice roll: " + mistakeDiceRoll);
    let currentCharacter = globalState.musicPlayerState.currentPlaying;
    let opponentCorrect = true;
    if (mistakeDiceRoll < mistakeRate) {
      let possibleMistakenCharacters = [];
      deckInfo.playerDeck.forEach((deckCard) => {
        if (deckCard && characterExists(deckCard[0]) && deckCard[0] !== currentCharacter) {
          possibleMistakenCharacters.push(deckCard[0]);
        }
      });
      deckInfo.opponentDeck.forEach((deckCard) => {
        if (deckCard && characterExists(deckCard[0]) && deckCard[0] !== currentCharacter) {
          possibleMistakenCharacters.push(deckCard[0]);
        }
      });
      if (possibleMistakenCharacters.length > 0) {
        opponentCorrect = false;
        const mistakenCharacterDiceRoll = Math.floor(Math.random() * possibleMistakenCharacters.length);
        const mistakenCharacter = possibleMistakenCharacters[mistakenCharacterDiceRoll];
        // add to opponent mistaken
        let newOpponentMistaken = roundInfo.opponentMistaken.slice();
        newOpponentMistaken.push(mistakenCharacter);
        setRoundInfo({
          ...roundInfo,
          opponentTimeout: null,
          opponentMistaken: newOpponentMistaken,
        });
      }
    }
    if (opponentCorrect) {
      let found = false;
      deckInfo.playerDeck.forEach((deckCard) => {
        if (deckCard && deckCard[0] === currentCharacter) {
          found = true;
        }
      });
      deckInfo.opponentDeck.forEach((deckCard) => {
        if (deckCard && deckCard[0] === currentCharacter) {
          found = true;
        }
      });
      if (found) {
        console.log("Opponent click: Correct!");
        setRoundInfo({
          ...roundInfo,
          opponentTimeout: null,
          foundTimestamp: Date.now(),
          foundBy: 2,
        });
      } else {
        console.log("Opponent click: No correct card found.");
        setRoundInfo({
          ...roundInfo,
          opponentTimeout: null,
        });
      }
    }
  }

  function settleRound() {
    const currentCharacter = globalState.musicPlayerState.currentPlaying;
    let foundBy = roundInfo.foundBy;
    let foundInPlayerDeck = false;
    let currentCharacterCard = null;
    deckInfo.playerDeck.forEach((deckCard) => {
      if (deckCard && deckCard[0] === currentCharacter) {
        foundInPlayerDeck = true;
        currentCharacterCard = [...deckCard];
      }
    });
    let foundInOpponentDeck = false;
    deckInfo.opponentDeck.forEach((deckCard) => {
      if (deckCard && deckCard[0] === currentCharacter) {
        foundInOpponentDeck = true;
        currentCharacterCard = [...deckCard];
      }
    });
    if (foundBy === 0) {
      // check if there is actually a card with the current character in the deck
      if (foundInPlayerDeck || foundInOpponentDeck) {
        // if so, we count this as opponent's when opponent is present
        if (hasOpponent) {
          foundBy = 2;
        } else {
          foundBy = 1;
          // count as a mistaken player click
          setTimingStats({
            ...timingStats,
            allClicks: timingStats.allClicks + 1,
            allAccumulateTime: timingStats.allAccumulateTime + (Date.now() - roundInfo.startTimestamp),
          })
        }
      }
    }
    if (foundBy === 1) {
      setGameInfo({
        ...gameInfo,
        playerObtained: [...gameInfo.playerObtained, currentCharacterCard],
      });
    } 
    if (foundBy === 2) {
      setGameInfo({
        ...gameInfo,
        opponentObtained: [...gameInfo.opponentObtained, currentCharacterCard],
      });
    }
    let newPlayerDeck = deckInfo.playerDeck.slice();
    let newOpponentDeck = deckInfo.opponentDeck.slice();
    // remove correct card from either deck, if exists
    if (foundInPlayerDeck) {
      for (let i = 0; i < newPlayerDeck.length; i++) {
        if (newPlayerDeck[i] && newPlayerDeck[i][0] === currentCharacter) {
          newPlayerDeck[i] = null;
        }
      }
    }
    if (foundInOpponentDeck) {
      for (let i = 0; i < newOpponentDeck.length; i++) {
        if (newOpponentDeck[i] && newOpponentDeck[i][0] === currentCharacter) {
          newOpponentDeck[i] = null;
        }
      }
    }
    if (!hasOpponent || !traditionalMode) {
      setDeckInfo({
        playerDeck: newPlayerDeck,
        opponentDeck: newOpponentDeck,
      });
    } else { // traditionalMode && hasOpponent
      let playerGives = newPlayerDeck.map((deckCard) => {
        return (deckCard !== null) && roundInfo.opponentMistaken.includes(deckCard[0]);
      });
      let opponentGives = newOpponentDeck.map((deckCard) => {
        return (deckCard !== null) && roundInfo.playerMistaken.includes(deckCard[0]);
      });
      let playerTakeRandomCount = newPlayerDeck.filter((deckCard) => {
        return (deckCard !== null) && roundInfo.playerMistaken.includes(deckCard[0]);
      }).length;
      let opponentTakeRandomCount = newOpponentDeck.filter((deckCard) => {
        return (deckCard !== null) && roundInfo.opponentMistaken.includes(deckCard[0]);
      }).length;
      if (foundBy === 1 && foundInOpponentDeck) { opponentTakeRandomCount++; }
      if (foundBy === 2 && foundInPlayerDeck) { playerTakeRandomCount++; }
      const minusCount = Math.min(playerTakeRandomCount, opponentTakeRandomCount);
      playerTakeRandomCount -= minusCount;
      opponentTakeRandomCount -= minusCount;
      for (let i = 0; i < playerGives.length; i++) {
        if (playerGives[i] && playerTakeRandomCount > 0) {
          playerGives[i] = false;
          playerTakeRandomCount--;
        }
      }
      for (let i = 0; i < opponentGives.length; i++) {
        if (opponentGives[i] && opponentTakeRandomCount > 0) {
          opponentGives[i] = false;
          opponentTakeRandomCount--;
        }
      }
      while (playerTakeRandomCount > 0) {
        let choices = [];
        newOpponentDeck.forEach((deckCard, index) => {
          let a = deckCard && characterExists(deckCard[0]) && !opponentGives[index];
          if (a) {choices.push(index);}
        });
        if (choices.length === 0) break;
        const choiceIndex = Math.floor(Math.random() * choices.length);
        const choice = choices[choiceIndex];
        opponentGives[choice] = true;
        playerTakeRandomCount--;
      }
      while (opponentTakeRandomCount > 0) {
        let choices = [];
        newPlayerDeck.forEach((deckCard, index) => {
          let a = deckCard && characterExists(deckCard[0]) && !playerGives[index];
          if (a) {choices.push(index);}
        });
        if (choices.length === 0) break;
        const choiceIndex = Math.floor(Math.random() * choices.length);
        const choice = choices[choiceIndex];
        playerGives[choice] = true;
        opponentTakeRandomCount--;
      }
      // cancel gives in playerGives and opponentGives
      while (true) {
        let playerGiveIndices = [];
        playerGives.forEach((value, index) => {
          if (value) {playerGiveIndices.push(index);}
        });
        let opponentGiveIndices = [];
        opponentGives.forEach((value, index) => {
          if (value) {opponentGiveIndices.push(index);}
        });
        if (playerGiveIndices.length === 0 || opponentGiveIndices.length === 0) break;
        const playerCancelIndex = Math.floor(Math.random() * playerGiveIndices.length);
        const opponentCancelIndex = Math.floor(Math.random() * opponentGiveIndices.length);
        playerGives[playerGiveIndices[playerCancelIndex]] = false;
        opponentGives[opponentGiveIndices[opponentCancelIndex]] = false;
      }
      // give
      let playerSlots = [];
      let opponentSlots = [];
      newPlayerDeck.forEach((deckCard, index) => {
        if (!deckCard || !characterExists(deckCard[0])) {
          playerSlots.push(index);
        }
      });
      newOpponentDeck.forEach((deckCard, index) => {
        if (!deckCard || !characterExists(deckCard[0])) {
          opponentSlots.push(index);
        }
      });
      playerGives.forEach((value, index) => {
        if (value && opponentSlots.length > 0) {
          const slotIndex = Math.floor(Math.random() * opponentSlots.length);
          const slot = opponentSlots[slotIndex];
          newOpponentDeck[slot] = newPlayerDeck[index];
          newPlayerDeck[index] = null;
          opponentSlots.splice(slotIndex, 1);
        }
      });
      opponentGives.forEach((value, index) => {
        if (value && playerSlots.length > 0) {
          const slotIndex = Math.floor(Math.random() * playerSlots.length);
          const slot = playerSlots[slotIndex];
          newPlayerDeck[slot] = newOpponentDeck[index];
          newOpponentDeck[index] = null;
          playerSlots.splice(slotIndex, 1);
        }
      });
      setDeckInfo({
        playerDeck: newPlayerDeck,
        opponentDeck: newOpponentDeck,
      });
    }
  }

  function newRound() {
    console.log("New round");
    // if opponentTimeout is set, clear it
    if (roundInfo.opponentTimeoutSet) {
      clearTimeout(roundInfo.opponentTimeout);
    }
    let opponentTimeout = null;
    if (hasOpponent && !gameFinished) {
      const clickTime = randomizeOpponentClickTime();
      console.log("New round: Opponent click in " + clickTime + "ms");
      opponentTimeout = setTimeout(simulateOpponentClick, clickTime);
    }
    setRoundInfo({
      startTimestamp: Date.now(),
      foundTimestamp: Date.now(),
      opponentTimeoutSet: true,
      opponentTimeout: opponentTimeout,
      opponentMistaken: [],
      playerMistaken: [],
      foundBy: 0,
    });
  }

  const nextMusicCallback = () => {
    if (!gameStarted) return;
    console.log("Next music callback, paused = " + globalState.playbackState.paused);
    if (!globalState.playbackState.paused) {
      newRound();
    } else {
      resetRoundInfo();
    }
  };

  const startGame = () => {
    globalMethods.reroll(true);
    setFilterUnselectedMusic(false);
    setGameInfo({
      gameStarted: true,
      playerObtained: [],
      opponentObtained: [],
    });
    resetRoundInfo();
    resetTimingStats();
  }

  const stopGame = () => {
    setGameInfo({
      gameStarted: false,
      playerObtained: [],
      opponentObtained: [],
    });
    resetRoundInfo();
  }

  globalMethods.registerNextMusicCallback(nextMusicCallback);

  return <Box width="100%" padding={1}>
    <Paper 
      ref={canvasRef}
      variant="outlined"
      sx={{
        width: "100%",
        height: canvasHeight,
        position: "relative",
        overflow: "hidden",
        transition: "height 0.5s",
      }}
    >
      {renderedCards}
      {slider}

      {/* Buttons */}

      {createButton("deckSmallerButton",
        <DeckSmallerIcon sx={{fontSize: "1em"}}></DeckSmallerIcon>, 
        deckLeft + deckWidthPixels + canvasSpacing, playerDeckTop,
        () => {
          const newValue = Math.max(
            layoutInfo.deckCanvasRatio - CL.deckCanvasRatio.interval,
            CL.deckCanvasRatio.min
          );
          setLayoutInfo({
            ...layoutInfo,
            deckCanvasRatio: newValue
          });
          docCookies.setItem("deckCanvasRatio", newValue);
        },
        layoutInfo.deckCanvasRatio <= CL.deckCanvasRatio.min
      )}
      {createButton("deckLargerButton",
        <DeckLargerIcon sx={{fontSize: "1em"}}></DeckLargerIcon>, 
        deckLeft + deckWidthPixels + canvasSpacing * 2 + buttonSize, playerDeckTop,
        () => {
          const newValue = Math.min(
            layoutInfo.deckCanvasRatio + CL.deckCanvasRatio.interval,
            CL.deckCanvasRatio.max
          );
          setLayoutInfo({
            ...layoutInfo,
            deckCanvasRatio: newValue
          });
          docCookies.setItem("deckCanvasRatio", newValue);
        },
        layoutInfo.deckCanvasRatio >= CL.deckCanvasRatio.max
      )}
      {createText("deckSizeText", 
        "卡牌尺寸", 
        deckLeft + deckWidthPixels + canvasSpacing, playerDeckTop + buttonSize + canvasSpacing,
        gameStarted, false
      )}
      
      <TimerDisplay roundInfo={roundInfo}
        updating={gameStarted && !globalState.playbackState.paused && !gameFinished}
        sx={{
          position: "absolute",
          left: deckLeft + deckWidthPixels + canvasSpacing,
          top: middlebandTop,
          height: middlebandHeight,
          color: gameStarted ? "white" : "transparent",
          transition: "color 0.5s, top 0.5s, left 0.5s, height 0.5s",
          fontFamily: "monospace",
          fontSize: "2em",
          paddingLeft: "0.5em",
          display: "flex",
          alignItems: "center",

        }}
      ></TimerDisplay>
      {createText("playerTimingStatisticsText", 
        (
          "正确率: " + (timingStats.allClicks === 0 ? "N/A" : (
            timingStats.correctClicks + "/" + timingStats.allClicks + " = " +
            (timingStats.correctClicks / timingStats.allClicks * 100).toFixed(1) + "%"
          )) + "\n" +
          "平均响应: " + (timingStats.allClicks === 0 ? "N/A" : 
            (timingStats.allAccumulateTime / timingStats.allClicks / 1000).toFixed(2) + "s"
          ) + "\n" +
          "正确响应: " + (timingStats.correctClicks === 0 ? "N/A" : 
            (timingStats.correctAccumulateTime / timingStats.correctClicks / 1000).toFixed(2) + "s") 
        ),
        deckLeft + deckWidthPixels + canvasSpacing, 
        "auto",
        !gameStarted, false, {
          bottom: canvasHeight - playerDeckBottom,
          width: canvasWidth - (deckLeft + deckWidthPixels + canvasSpacing + canvasMargin),
          textAlign: "left",
          whiteSpace: "nowrap",
        }
      )}

      {createButton("increaseDeckWidthButton",
        <AddIcon sx={{fontSize: "1em"}}></AddIcon>, 
        !gameStarted ? (deckLeft + deckWidthPixels + canvasSpacing) : (canvasWidth + canvasSpacing),
        playerDeckBottom - buttonSize,
        () => {
          const newValue = Math.min(layoutInfo.deckWidth + 1, CL.deckWidth.max);
          setLayoutInfo({
            ...layoutInfo,
            deckWidth: newValue
          });
          docCookies.setItem("deckWidth", newValue);
        },
        gameStarted || layoutInfo.deckWidth >= CL.deckWidth.max
      )}
      {createButton("decreaseDeckWidthButton",
        <RemoveIcon sx={{fontSize: "1em"}}></RemoveIcon>, 
        !gameStarted ? (deckLeft + deckWidthPixels + canvasSpacing) : (canvasWidth + canvasSpacing),
        playerDeckBottom - buttonSize * 2 - canvasSpacing,
        () => {
          const newValue = Math.max(layoutInfo.deckWidth - 1, CL.deckWidth.min);
          setLayoutInfo({
            ...layoutInfo,
            deckWidth: newValue
          });
          docCookies.setItem("deckWidth", newValue);
        },
        gameStarted || (layoutInfo.deckWidth <= CL.deckWidth.min),
        "warning"
      )}
      {createButton("increaseDeckHeightButton",
        <AddIcon sx={{fontSize: "1em"}}></AddIcon>, 
        deckLeft + deckWidthPixels - buttonSize, 
        !gameStarted ? (playerDeckBottom + canvasSpacing) : (canvasHeight + canvasSpacing),
        () => {
          const newValue = Math.min(layoutInfo.deckHeight + 1, CL.deckHeight.max);
          setLayoutInfo({
            ...layoutInfo,
            deckHeight: newValue
          });
          docCookies.setItem("deckHeight", newValue);
        },
        gameStarted || layoutInfo.deckHeight >= CL.deckHeight.max
      )}
      {createButton("decreaseDeckHeightButton",
        <RemoveIcon sx={{fontSize: "1em"}}></RemoveIcon>, 
        deckLeft + deckWidthPixels - buttonSize * 2 - canvasSpacing, 
        !gameStarted ? (playerDeckBottom + canvasSpacing) : (canvasHeight + canvasSpacing),
        () => {
          const newValue = Math.max(layoutInfo.deckHeight - 1, CL.deckHeight.min);
          setLayoutInfo({
            ...layoutInfo,
            deckHeight: newValue
          });
          docCookies.setItem("deckHeight", newValue);
        },
        gameStarted || layoutInfo.deckHeight <= CL.deckHeight.min,
        "warning"
      )}
      {createText("deckCardNumberText", 
        "卡牌数量", 
        deckLeft + deckWidthPixels + canvasSpacing, 
        !gameStarted ? (playerDeckBottom + canvasSpacing) : (canvasHeight + canvasSpacing),
        false, false
      )}
      {createButton("randomFillOpponentDeck",
        <ShuffleIcon sx={{fontSize: "1em"}}></ShuffleIcon>,
        !gameStarted ? opponentEnabledButtonLeft : (-canvasSpacing - buttonSize), 
        hasOpponent ? (opponentDeckBottom - buttonSize * 2 - canvasSpacing) : opponentEnabledButtonTop,
        () => {
          let selectableCharacters = getSelectableCharacters();
          let newOpponentDeck = deckInfo.opponentDeck.slice();
          for (let i = 0; i < newOpponentDeck.length; i++) {
            if (selectableCharacters.length === 0) { break; }
            if (newOpponentDeck[i] === null || !characterExists(newOpponentDeck[i][0])) {
              const randomIndex = Math.floor(Math.random() * selectableCharacters.length);
              const randomCharacter = selectableCharacters[randomIndex];
              const cardList = data.data[randomCharacter]["card"];
              if (typeof cardList === "string") {
                newOpponentDeck[i] = [randomCharacter, 0];
              } else {
                const randomCardIndex = Math.floor(Math.random() * cardList.length);
                newOpponentDeck[i] = [randomCharacter, randomCardIndex];
              }
              selectableCharacters.splice(randomIndex, 1);
            }
          }
          setDeckInfo({
            ...deckInfo,
            opponentDeck: newOpponentDeck,
          });
        },
        gameStarted || !hasOpponent || opponentDeckFull, "primary", true
      )}
      {createText("randomFillOpponentText", 
        "随机", 
        !gameStarted ? (opponentEnabledButtonLeft - canvasSpacing) : (-canvasSpacing * 2 - buttonSize), 
        hasOpponent ? (opponentDeckBottom - buttonSize * 2 - canvasSpacing) : opponentEnabledButtonTop,
        !hasOpponent, true
      )}
      {createButton("clearOpponentDeck",
        <ClearIcon sx={{fontSize: "1em"}}></ClearIcon>,
        !gameStarted ? opponentEnabledButtonLeft : (-canvasSpacing - buttonSize), 
        hasOpponent ? (opponentDeckBottom - buttonSize * 3 - canvasSpacing * 2) : opponentEnabledButtonTop,
        () => {
          let newOpponentDeck = Array(layoutInfo.deckWidth * layoutInfo.deckHeight).fill(null);
          setDeckInfo({
            ...deckInfo,
            opponentDeck: newOpponentDeck,
          });
        },
        gameStarted || !hasOpponent || opponentDeckEmpty, "error", true
      )}
      {createText("clearFillOpponentText", 
        "清空", 
        !gameStarted ? (opponentEnabledButtonLeft - canvasSpacing) : (-canvasSpacing * 2 - buttonSize), 
        hasOpponent ? (opponentDeckBottom - buttonSize * 3 - canvasSpacing * 2) : opponentEnabledButtonTop,
        !hasOpponent, true
      )}
      {createButton("shuffleOpponentDeck",
        <RefreshIcon sx={{fontSize: "1em"}}></RefreshIcon>,
        !gameStarted ? opponentEnabledButtonLeft : (-canvasSpacing - buttonSize), 
        hasOpponent ? (opponentDeckBottom - buttonSize * 4 - canvasSpacing * 3) : opponentEnabledButtonTop,
        () => {
          let newOpponentDeck = deckInfo.opponentDeck.slice();
          for (let i = newOpponentDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newOpponentDeck[i], newOpponentDeck[j]] = [newOpponentDeck[j], newOpponentDeck[i]];
          }
          setDeckInfo({
            ...deckInfo,
            opponentDeck: newOpponentDeck,
          });
        },
        gameStarted || !hasOpponent || opponentDeckEmpty, "warning", true
      )}
      {createText("shuffleOpponentText", 
        "乱序", 
        !gameStarted ? (opponentEnabledButtonLeft - canvasSpacing) : (-canvasSpacing * 2 - buttonSize), 
        hasOpponent ? (opponentDeckBottom - buttonSize * 4 - canvasSpacing * 3) : opponentEnabledButtonTop,
        !hasOpponent, true
      )}
      {createButton("randomFillPlayerDeck",
        <ShuffleIcon sx={{fontSize: "1em"}}></ShuffleIcon>,
        !gameStarted ? opponentEnabledButtonLeft : (-canvasSpacing - buttonSize), 
        playerDeckTop + (hasOpponent ? 0 : canvasSpacing + buttonSize),
        () => {
          let selectableCharacters = getSelectableCharacters();
          let newPlayerDeck = deckInfo.playerDeck.slice();
          for (let i = 0; i < newPlayerDeck.length; i++) {
            if (selectableCharacters.length === 0) { break; }
            if (newPlayerDeck[i] === null || !characterExists(newPlayerDeck[i][0])) {
              const randomIndex = Math.floor(Math.random() * selectableCharacters.length);
              const randomCharacter = selectableCharacters[randomIndex];
              const cardList = data.data[randomCharacter]["card"];
              if (typeof cardList === "string") {
                newPlayerDeck[i] = [randomCharacter, 0];
              } else {
                const randomCardIndex = Math.floor(Math.random() * cardList.length);
                newPlayerDeck[i] = [randomCharacter, randomCardIndex];
              }
              selectableCharacters.splice(randomIndex, 1);
            }
          }
          setDeckInfo({
            ...deckInfo,
            playerDeck: newPlayerDeck,
          });
        },
        gameStarted || playerDeckFull, "primary"
      )}
      {createText("randomFillPlayerText", 
        "随机", 
        !gameStarted ? (opponentEnabledButtonLeft - canvasSpacing) : (-canvasSpacing * 2 - buttonSize), 
        playerDeckTop + (hasOpponent ? 0 : canvasSpacing + buttonSize),
        false, true
      )}
      {createButton("clearPlayerDeck",
        <ClearIcon sx={{fontSize: "1em"}}></ClearIcon>,
        !gameStarted ? opponentEnabledButtonLeft : (-canvasSpacing - buttonSize), 
        playerDeckTop + buttonSize + canvasSpacing + (hasOpponent ? 0 : canvasSpacing + buttonSize),
        () => {
          let newPlayerDeck = Array(layoutInfo.deckWidth * layoutInfo.deckHeight).fill(null);
          setDeckInfo({
            ...deckInfo,
            playerDeck: newPlayerDeck,
          });
        },
        gameStarted || playerDeckEmpty, "error"
      )}
      {createText("clearFillPlayerText", 
        "清空", 
        !gameStarted ? (opponentEnabledButtonLeft - canvasSpacing) : (-canvasSpacing * 2 - buttonSize), 
        playerDeckTop + buttonSize + canvasSpacing + (hasOpponent ? 0 : canvasSpacing + buttonSize),
        false, true
      )}
      {createButton("shufflePlayerDeck",
        <RefreshIcon sx={{fontSize: "1em"}}></RefreshIcon>,
        !gameStarted ? opponentEnabledButtonLeft : (-canvasSpacing - buttonSize), 
        playerDeckTop + buttonSize * 2 + canvasSpacing * 2 + (hasOpponent ? 0 : canvasSpacing + buttonSize),
        () => {
          let newPlayerDeck = deckInfo.playerDeck.slice();
          for (let i = newPlayerDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newPlayerDeck[i], newPlayerDeck[j]] = [newPlayerDeck[j], newPlayerDeck[i]];
          }
          setDeckInfo({
            ...deckInfo,
            playerDeck: newPlayerDeck,
          });
        },
        gameStarted || playerDeckEmpty, "warning", true
      )}
      {createText("shufflePlayerText", 
        "乱序", 
        !gameStarted ? (opponentEnabledButtonLeft - canvasSpacing) : (-canvasSpacing * 2 - buttonSize), 
        playerDeckTop + buttonSize * 2 + canvasSpacing * 2 + (hasOpponent ? 0 : canvasSpacing + buttonSize),
        false, true
      )}
      {createButton("startGame",
        !gameStarted ? <PlayIcon sx={{fontSize: "1em"}}></PlayIcon> : <StopIcon sx={{fontSize: "1em"}}></StopIcon>,
        opponentEnabledButtonLeft, 
        gameStarted ? playerDeckTop : playerDeckTop + buttonSize * 3 + canvasSpacing * 3 + (!hasOpponent ? (canvasSpacing + buttonSize) : 0),
        () => {
          globalMethods.userPause();
          if (!gameStarted) {
            startGame();
          } else {
            stopGame();
          }
        },
        (!gameStarted) ? (!(playerDeckFull && (!hasOpponent || opponentDeckFull))) : (false), !gameStarted ? "success" : "error"
      )}
      {createText("playButtonText", 
        !gameStarted ? "开始游戏" : "结束游戏", 
        opponentEnabledButtonLeft - canvasSpacing, 
        gameStarted ? playerDeckTop : playerDeckTop + buttonSize * 3 + canvasSpacing * 3 + (!hasOpponent ? (canvasSpacing + buttonSize) : 0),
        false, true
      )}
      {<Box
        key="filterButton"
        sx={{
          ...iconButtonProperties.boxStyle,
          left: opponentEnabledButtonLeft, 
          top: gameStarted 
            ? playerDeckTop + buttonSize + canvasSpacing
            : canvasHeight + canvasSpacing,
          "&:hover": null,
          backgroundColor: filterUnselectedMusic ? "primary.main" : "black",
        }}
        onClick={() => {
          if (!gameStarted) {return;}
          if (filterUnselectedMusic) {
            let temporarySkip = {...globalState.musicPlayerState.temporarySkip};
            Object.keys(temporarySkip).forEach((character) => {
              temporarySkip[character] = false;
            });
            globalState.setMusicPlayerState({
              ...globalState.musicPlayerState,
              temporarySkip: temporarySkip
            })
          } else {
            let temporarySkip = {...globalState.musicPlayerState.temporarySkip};
            Object.keys(temporarySkip).forEach((character) => {
              temporarySkip[character] = true;
            });
            deckInfo.playerDeck.forEach((deckCard) => {
              if (deckCard && characterExists(deckCard[0])) {
                temporarySkip[deckCard[0]] = false;
              }
            });
            deckInfo.opponentDeck.forEach((deckCard) => {
              if (deckCard && characterExists(deckCard[0])) {
                temporarySkip[deckCard[0]] = false;
              }
            });
            gameInfo.playerObtained.forEach((deckCard) => {
              if (deckCard && characterExists(deckCard[0])) {
                temporarySkip[deckCard[0]] = false;
              }
            });
            gameInfo.opponentObtained.forEach((deckCard) => {
              if (deckCard && characterExists(deckCard[0])) {
                temporarySkip[deckCard[0]] = false;
              }
            });
            const playOrder = globalState.musicPlayerState.playOrder;
            let newPlayingCharacter = globalState.musicPlayerState.currentPlaying;
            let newPlayingIndex = playOrder.indexOf(newPlayingCharacter);
            for (let i = 0; i < playOrder.length; i++) {
              if (!temporarySkip[playOrder[newPlayingIndex]]) {
                newPlayingCharacter = playOrder[newPlayingIndex];
                break;
              }
              newPlayingIndex = (newPlayingIndex + 1) % playOrder.length;
            }
            globalState.setMusicPlayerState({
              ...globalState.musicPlayerState,
              temporarySkip: temporarySkip,
              currentPlaying: newPlayingCharacter,
            });
          }
          setFilterUnselectedMusic(!filterUnselectedMusic);
        }}
      >
        {filterUnselectedMusic 
          ? <FilterOnIcon sx={{color: "black", fontSize: "1em"}}></FilterOnIcon> 
          : <FilterOffIcon sx={{color: "primary.main", fontSize: "1em"}}></FilterOffIcon>
        }
      </Box>}
      {createText("filterButtonText", 
        filterUnselectedMusic ? "仅播放选中" : "播放所有", 
        opponentEnabledButtonLeft - canvasSpacing, 
        gameStarted 
          ? playerDeckTop + buttonSize + canvasSpacing
          : canvasHeight + canvasSpacing,
        false, true
      )}
      {<Box
        key="opponentEnabledButton"
        sx={{
          ...iconButtonProperties.boxStyle,
          left: !gameStarted ? opponentEnabledButtonLeft : (-canvasSpacing - buttonSize), 
          top: opponentEnabledButtonTop,
          "&:hover": null,
          backgroundColor: layoutInfo.hasOpponent ? "primary.main" : "black",
        }}
        onClick={() => {
          if (gameStarted) {return;}
          setLayoutInfo({
            ...layoutInfo,
            hasOpponent: !layoutInfo.hasOpponent
          });
          docCookies.setItem("hasOpponent", layoutInfo.hasOpponent ? "F" : "T");
        }}
      >
        <OpponentIcon sx={{
          color: layoutInfo.hasOpponent ? "black" : "primary.main",
          fontSize: "1em"
        }}></OpponentIcon>
      </Box>}
      {createText("opponentEnabledText", 
        "对手", 
        !gameStarted ? (opponentEnabledButtonLeft - canvasSpacing) : (-canvasSpacing * 2 - buttonSize), 
        opponentEnabledButtonTop,
        false, true
      )}
      {<TextField sx={{
          ...textfieldStyles,
          left: (gameStarted || !hasOpponent) ? canvasWidth + canvasSpacing : deckLeft + deckWidthPixels + canvasSpacing,
          top: opponentDeckTop,
        }}
        key="timeAverageTextField"
        size="small"
        label="平均反应时间"
        className="chinese"
        inputProps={{...CL.opponentTimeAverage}}
        disabled={gameStarted}
        type="number"
        value={opponentSettings.timeAverage}
        onChange={(e) => {
          const newValue = clClamp(parseFloat(e.target.value), CL.opponentTimeAverage);
          setOpponentSettings({
            ...opponentSettings,
            timeAverage: newValue
          });
          docCookies.setItem("opponentTimeAverage", newValue);
        }}
      >
      </TextField>}
      {<TextField sx={{
          ...textfieldStyles,
          left: (gameStarted || !hasOpponent) ? canvasWidth + canvasSpacing : deckLeft + deckWidthPixels + canvasSpacing,
          top: opponentDeckTop + textfieldHeight + canvasSpacing,
        }}
        size="small"
        label="时间波动"
        className="chinese"
        type="number"
        value={opponentSettings.timeDeviation}
        inputProps={{...CL.opponentTimeDeviation}}
        disabled={gameStarted}
        onChange={(e) => {
          const newValue = clClamp(parseFloat(e.target.value), CL.opponentTimeDeviation);
          setOpponentSettings({
            ...opponentSettings,
            timeDeviation:newValue
          });
          docCookies.setItem("opponentTimeDeviation", newValue);
        }}
      >
      </TextField>}
      {<TextField sx={{
          ...textfieldStyles,
          left: (gameStarted || !hasOpponent) ? canvasWidth + canvasSpacing : deckLeft + deckWidthPixels + canvasSpacing,
          top: opponentDeckTop + textfieldHeight * 2 + canvasSpacing * 2,
        }}
        size="small"
        label="犯错概率"
        className="chinese"
        type="number"
        value={opponentSettings.mistakeRate}
        inputProps={{...CL.opponentMistakeRate}}
        disabled={gameStarted}
        onChange={(e) => {
          const newValue = clClamp(parseFloat(e.target.value), CL.opponentMistakeRate);
          setOpponentSettings({
            ...opponentSettings,
            mistakeRate: newValue
          });
          docCookies.setItem("opponentMistakeRate", newValue);
        }}
      >
      </TextField>}
      
      {<Box
        key="traditionalModeButton"
        sx={{
          ...iconButtonProperties.boxStyle,
          left: (gameStarted || !hasOpponent) ? canvasWidth + canvasSpacing : deckLeft + deckWidthPixels + canvasSpacing,
          top: opponentDeckTop + textfieldHeight * 3 + canvasSpacing * 3,
          "&:hover": null,
          backgroundColor: !opponentSettings.traditionalMode ? "primary.main" : "black",
        }}
        onClick={() => {
          if (gameStarted) {return;}
          setOpponentSettings({
            ...opponentSettings,
            traditionalMode: !opponentSettings.traditionalMode
          });
          docCookies.setItem("traditionalMode", opponentSettings.traditionalMode ? "F" : "T");
        }}
      >
        <TraditionalIcon sx={{
          color: !opponentSettings.traditionalMode ? "black" : "primary.main",
          fontSize: "1em"
        }}></TraditionalIcon>
      </Box>}
      {createText("traditionalModeText", 
        (!opponentSettings.traditionalMode) ? "自由模式" : "传统模式", 
        ((gameStarted || !hasOpponent) ? canvasWidth + canvasSpacing : deckLeft + deckWidthPixels + canvasSpacing) + buttonSize + canvasSpacing,
        opponentDeckTop + textfieldHeight * 3 + canvasSpacing * 3,
        false, false, {
          width: canvasWidth - (deckLeft + deckWidthPixels + canvasSpacing + canvasMargin),
          textAlign: "left",
        }
      )}
      {createText("traditionalModeDescriptionText", 
        ((!opponentSettings.traditionalMode)
          ? "卡片归属方不会变动，游戏结束时持有卡牌多者获胜。"
          : "卡片归属方会变动，正确选择将减少本方卡片，错误选择增加本方卡片，先清空本方卡片者获胜。"
        ),
         
        (gameStarted || !hasOpponent) ? canvasWidth + canvasSpacing : deckLeft + deckWidthPixels + canvasSpacing,
        opponentDeckTop + textfieldHeight * 3 + canvasSpacing * 4 + buttonSize,
        false, false, {
          width: canvasWidth - (deckLeft + deckWidthPixels + canvasSpacing + canvasMargin),
          textAlign: "left",
        }
      )}
      {createText("playerObtainedText",
        playerObtained.length.toString(),
        gameStarted ? (canvasWidth - canvasMargin - cardWidth) : (canvasWidth + canvasSpacing),
        playerObtainedTop,
        false, false, {
          fontFamily: "Georgia, serif",
          fontSize: cardWidth * 0.45 + "px",
          width: cardWidth,
          height: cardHeight,
          textAlign: "center",
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
        }
      )}
      {createText("opponentObtainedText",
        opponentObtained.length.toString(),
        (hasOpponent && gameStarted) ? (canvasMargin) : (-cardWidth - canvasSpacing),
        opponentObtainedTop,
        false, false, {
          fontFamily: "Georgia, serif",
          fontSize: cardWidth * 0.45 + "px",
          width: cardWidth,
          height: cardHeight,
          textAlign: "center",
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
        }
      )}
      {<Box sx={{
        position: "absolute",
        left: gameStarted ? (clientWidth - playControlsWidth) / 2 : canvasWidth + canvasSpacing,
        top: playerDeckTop - canvasSpacing - middlebandHeight,
        transition: "top 0.5s, left 0.5s",
      }}>
        <PlayControls
          onPreviousClick={globalMethods.onPreviousMusicClick}
          onNextClick={() => {
            globalMethods.onNextMusicClick();
            if (!gameFinished) {settleRound();}
          }}
          onPauseClick={() => {
            globalMethods.onPauseMusicClick();
            if (!roundInfo.opponentTimeoutSet && !gameFinished) {
              const playbackState = globalState.playbackState;
              if (playbackState.paused || playbackState.playbackPaused) {
                newRound();
              }
            }
          }}
          globalState={globalState}
        ></PlayControls>
      </Box>}
    </Paper>
  </Box>
  
}
GameSimulatorPanel.displayName = "GameSimulatorPanel";

export default GameSimulatorPanel;