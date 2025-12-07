import { 
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Stack,
  Collapse, Button, Box, Typography, Link, ButtonGroup
} from '@mui/material';
import docCookies from './docCookies';
import { useState, useEffect } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  RadioButtonChecked as HalfIcon,
  Circle as FullIcon,
  CircleOutlined as EmptyIcon,
  Close as CrossIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const cardStyleSet = [
  ["dairi-sd", "cards/", 
    <Typography color="gray" key="0">
      Free super-deformed tachies from dairi Twitter <Link href="https://x.com/dairi155">@dairi155</Link>. 
      I decided that some
      characters should look happier than others, and some gloomier.
    </Typography>
  ],
  ["dairi", "cards-dairi/", 
    <Typography color="gray" key="1">
      Free super-deformed tachies from dairi Twitter <Link href="https://x.com/dairi155">@dairi155</Link>. Respect to the very diligent illustrator.
    </Typography>
  ],
  ["enbu", "cards-enbu/", 
    <Typography color="gray" key="2">
      Free tachies from RPG game <Link hrerf="http://www.fo-lens.net/enbu_ap/">幻想人形演舞-ユメノカケラ-</Link>. 
      Well, don&apos;t blame me if some
      characters&apos; head seem greater than others&apos;.
    </Typography>
  ],
  ["enbu-dolls", "cards-enbu-dolls/", 
    <Typography color="gray" key="3">
      Free tachies from RPG game <Link href="http://www.fo-lens.net/enbu_ap/">幻想人形演舞-ユメノカケラ-</Link>. They were intended for the dolls as
      a part of the original game. Cute aren&apos;t they?
    </Typography>
  ],
  ["thwiki-sd", "cards-thwiki/", 
    <Typography color="gray" key="4">
      Art from <Link href="https://thwiki.cc/">thbwiki</Link>. The music here is also linked from their storage so I can host
      this website without renting a server. 
    </Typography>
  ],
  ["zun", "cards-zun/", 
    <Typography color="gray" key="5">
      Well, cheers for those who love ZUN&apos;s art. Who else on earth would use these for playing?
      I don&apos;t have the copyright and should not have used
      these here, but let&apos;s pray no one cares.
    </Typography>
  ],
]

function isCardPrefixValid(prefix) {
  for (let i = 0; i < cardStyleSet.length; i++) {
    if (cardStyleSet[i][1] === prefix) {
      return true;
    }
  }
  return false;
}

const recordMusicIdsCookie = (data, musicIds) => {
  let characters = Object.keys(data.data);
  let musicIdsList = [];
  for (let i = 0; i < characters.length; i++) {
    let character = characters[i];
    let musicId = musicIds[character];
    musicIdsList.push(musicId);
  }
  docCookies.setItem("musicIds", musicIdsList.join(","), Infinity);
}

const MusicIdSelectPanel = ({data, globalState, globalMethods}) => {

  const isSmallScreen = !useMediaQuery("(min-width:600px)");
  const theme = useTheme();

  const [ openedCharacter, rawSetOpenedCharacter ] = useState(null); 
  const [ openedSection, rawSetOpenedSection ] = useState(null);
  const [ openedPreset, rawSetOpenedPreset ] = useState(null);

  const [ lastOpenedCharacter, setLastOpenedCharacter ] = useState(null);
  const [ lastOpenedSection, setLastOpenedSection ] = useState(null);
  const [ lastOpenedPreset, setLastOpenedPreset ] = useState(null);

  const setOpenedCharacter = (v) => {
    if (openedCharacter !== v) {
      setLastOpenedCharacter(openedCharacter);
      rawSetOpenedCharacter(v);
    }
  }

  const setOpenedPreset = (v) => {
    if (openedPreset !== v) {
      setLastOpenedPreset(openedPreset);
      rawSetOpenedPreset(v);
    }
  }

  const setOpenedSection = (v) => {
    if (openedSection !== v) {
      setLastOpenedSection(openedSection);
      rawSetOpenedSection(v);
    }
  }

  let { musicPlayerState, setMusicPlayerState } = globalState;
  let { musicIds, currentPlaying } = musicPlayerState;
  let { playMusicOfCharacter, getMusicName, characterInPlaylist } = globalMethods;
  
  // cardPrefix
  let cardPrefixSelector = null; 
  {
    let selectors = [];
    const renderCollapseContent = openedSection === "cardPrefix" || lastOpenedSection === "cardPrefix";
    if (renderCollapseContent) {
      for (let i = 0; i < cardStyleSet.length; i++) {
        let [cardPrefix, cardPath, cardDescription] = cardStyleSet[i];
        selectors.push(<Box width="100%" key={i} alignItems="flex-start" justifyItems="flex-start" alignContent="flex-start" textAlign="left" spacing={1}>
            <FormControlLabel key={i} value={cardPath} control={<Radio size="medium" sx={{height: "1.5em"}} />} label={cardPrefix} />
            <Box paddingLeft={4}>{cardDescription}</Box>
          </Box>
        );
      }
    }
    cardPrefixSelector = (
      <Box width="100%"><Stack>
        <Button size="small" width="100%" color="warning" 
          variant={openedSection === "cardPrefix" ? "contained" : "outlined"}
          sx={{textTransform: "none", textAlign: "left", justifyContent: "flex-start"}}
          onClick={() => {
            if (openedSection === "cardPrefix") {
              setOpenedSection(null);
            } else {
              setOpenedSection("cardPrefix");
            }
          }}
          className="chinese"
        >卡牌风格选择</Button>
        <Collapse in={openedSection === "cardPrefix"}>
          <Box paddingTop={1} />
          {renderCollapseContent && <Box width="100%" paddingLeft={"2em"}>
            <RadioGroup 
              key="cardPrefix" 
              value={globalState.optionState.cardPrefix} 
              onChange={(event) => {
                let optionState = globalState.optionState;
                globalState.setOptionState({...optionState, cardPrefix: event.target.value});
                docCookies.setItem("cardPrefix", event.target.value, Infinity);
              }}
              spacing={1}
            >
              {selectors}
            </RadioGroup>
          </Box>}
        </Collapse>
      </Stack></Box>
    )
  }
  
  const setMusicIdsEnsurePlayExistent = (newMusicIds) => {
    let newMusicPlayerState = {...musicPlayerState, musicIds: newMusicIds};
    let playOrder = musicPlayerState.playOrder;
    if (newMusicIds[currentPlaying] === -1) {
      let character = currentPlaying;
      let index = (playOrder.indexOf(character) + 1) % playOrder.length;
      let attempts = 0;
      while (!characterInPlaylist(newMusicPlayerState, playOrder[index]) && attempts < playOrder.length) {
        // console.log(playOrder[index], "not in playlist");
        index = (index + 1) % playOrder.length;
        attempts++;
      }
      if (attempts >= playOrder.length) {
        console.warn("No valid character found in playlist");
        setMusicPlayerState(newMusicPlayerState);
        return;
      }
      playMusicOfCharacter(playOrder[index], {}, newMusicPlayerState);
    } else {
      setMusicPlayerState(newMusicPlayerState);
    }
  }

  const getMusicNameWithId = (character, id) => {
    let musicList = data.data[character].music;
    if (typeof musicList === 'string') {
      musicList = [musicList];
    }
    if (id === -1) { return "移除"; }
    let [musicName, albumName] = getMusicName(musicList[id]);
    return musicName + " (" + albumName + ")";
  }

  let presetsSelector = null;
  {
    const renderCollapseContent = openedSection === "presets" || lastOpenedSection === "presets";
    let selectors = [];
    if (renderCollapseContent) {
      Object.entries(data.idpresets).forEach(([tagName, pairs]) => {
        let fulfilled = [];
        let counter = 0;
        let totalPairs = Object.keys(pairs).length;
        Object.entries(pairs).map(([character, musicId]) => {
          if (musicIds[character] === musicId) {
            fulfilled.push(true);
            counter += 1;
          } else {
            fulfilled.push(false);
          }
        });
        const renderCollapseContent = tagName === openedPreset || tagName === lastOpenedPreset;
        selectors.push(<Box key={tagName} width="100%">
          <Box alignItems="center" display="flex">
            {totalPairs === counter && <FullIcon color={"warning"} />}
            {totalPairs !== counter && counter > 0 && <HalfIcon color={"success"} />}
            {counter === 0 && <EmptyIcon color={"primary"} />}
            <ButtonGroup size="small"
              className="chinese"
              sx={{
                textTransform: "none", justifyContent: "flex-start", textOverflow: "ellipsis", 
                overflow: "hidden", whiteSpace: "nowrap", marginRight: "1em",
                display: "flex", paddingLeft: "0.5em", width: "100%"
              }}
              color={totalPairs === counter ? "warning" : (
                counter > 0 ? "success" : "primary"
              )}
            >
              <Button width="80%" 
                variant={openedPreset === tagName ? "contained" : "outlined"}
                sx={{
                  flex: 3,
                  justifyContent: "flex-start",
                }} onClick={() => {
                if (openedPreset === tagName) {
                  setOpenedPreset(null);
                } else {
                  setOpenedPreset(tagName);
                }
              }}>{tagName}</Button>
              <Button width="20%" 
                variant={"outlined"}
                sx={{flex: 1, maxWidth: "100px"}} 
                disabled={totalPairs === counter}
                onClick={() => {
                  setOpenedPreset(tagName);
                  let newMusicIds = {...musicIds};
                  Object.entries(pairs).map(([character, musicId]) => {
                    newMusicIds[character] = musicId;
                  });
                  recordMusicIdsCookie(data, newMusicIds);
                  setMusicIdsEnsurePlayExistent(newMusicIds);
                }}
              >{totalPairs === counter ? "已应用" : "应用"}</Button>
            </ButtonGroup>
          </Box>
          <Collapse in={openedPreset === tagName} orientation="vertical">
            <Box paddingTop={1} />
            {renderCollapseContent && <Box width="100%" paddingLeft={"0.5em"}>
              <Stack>
                {Object.entries(pairs).map(([character, musicId], index) => {
                  return <Box key={index} sx={{
                    // overflow: "hidden", whiteSpace: "nowrap",
                    alignItems: "center", display: "flex"
                  }}>
                    {fulfilled[index] && <CheckIcon fontSize="small" color="warning"/>}
                    {!fulfilled[index] && <CrossIcon fontSize="small" color="primary"/>}
                    <Typography sx={{
                      // overflow: "hidden", whiteSpace: "nowrap",
                      alignItems: "center", paddingLeft: "0.2em",
                    }} color={fulfilled[index] ? "#ffa726" : "primary"}>
                      {character} ⇒ {getMusicNameWithId(character, musicId)}
                    </Typography>
                  </Box>
                })}
              </Stack>
            </Box>}
          </Collapse>
        </Box>)
      });
    }
    presetsSelector = (
      <Box width="100%"><Stack>
        <Button size="small" width="100%" color="warning" 
          variant={openedSection === "presets" ? "contained" : "outlined"}
          sx={{textTransform: "none", textAlign: "left", justifyContent: "flex-start"}}
          onClick={() => {
            if (openedSection === "presets") {
              setOpenedSection(null);
            } else {
              setOpenedSection("presets");
            }
          }}
          className="chinese"
        >预设选择</Button>
        <Collapse in={openedSection === "presets"}>
          <Box paddingTop={1} />
          {renderCollapseContent && <Box width="100%" paddingLeft={"2em"}>
            <Stack spacing={1}>
              <Typography color="gray" className="chinese">
                单击预设名展开或收起查看详情。
              </Typography>
              {selectors}
            </Stack>
          </Box>}
        </Collapse>
      </Stack></Box>
    )
  }

  let singleIdsSelector = null;
  {
    let selectors = [];
    Object.entries(data.data).forEach(([character, value]) => {
      let musicList = value["music"];
      if (musicList === undefined) {
        return;
      }
      if (typeof musicList === 'string') {
        musicList = [musicList];
      }
      let musicNames = []
      for (let i = 0; i < musicList.length; i++) {
        let [musicName, albumName] = getMusicName(musicList[i]);
        musicNames.push(musicName + " (" + albumName + ")");
      }
      let [selectedMusicName, selectedAlbumName] = ["", ""]
      let selectedId = musicIds[character];
      if (selectedId !== -1) {
        [selectedMusicName, selectedAlbumName] = getMusicName(musicList[selectedId]);
      }
      
      const renderCollapseContent = character === openedCharacter || character === lastOpenedCharacter;

      selectors.push(
        <FormControl variant="outlined" key={character} width="100%">
          <Box direction="row" spacing={1} width="100%" display="flex" justifyContent="center" alignItems="center">
            <Button size="small"
              variant={openedCharacter === character ? "contained" : "outlined"}
              onClick={() => {
                if (openedCharacter === character) {
                  setOpenedCharacter(null);
                } else {
                  setOpenedCharacter(character);
                }
              }}
              sx={{
                textTransform: "none", justifyContent: "flex-start", textOverflow: "ellipsis", 
                overflow: "hidden", whiteSpace: "nowrap", marginRight: "1em",
                minWidth: isSmallScreen ? "100%" : "1em"
              }}
            >{character}</Button>
            {!isSmallScreen && <Typography color="gray" sx={{
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              flexGrow: 1, textAlign: "right"
            }}>{selectedMusicName}</Typography>}
          </Box>
          <Collapse in={openedCharacter === character} orientation="vertical">
            <Box paddingTop={1} />
            {renderCollapseContent && <Box width="100%" paddingLeft={"0.5em"}>
              <RadioGroup 
                key={character} 
                variant="outlined"
                value={musicIds[character]} 
                onChange={(event) => {
                  let newMusicIds = {...musicIds}
                  newMusicIds[character] = parseInt(event.target.value);
                  recordMusicIdsCookie(data, newMusicIds);
                  setMusicIdsEnsurePlayExistent(newMusicIds);
                }}
              >
                {musicNames.map((musicName, index) => {
                  return (
                    <FormControlLabel 
                      key={index} 
                      value={index} 
                      control={<Radio />} 
                      label={musicName}
                      size="small"
                    />
                  );
                })}
                <FormControlLabel 
                  key={-1} 
                  value={-1} 
                  control={<Radio />} 
                  label="移除"
                  size="small"
                />
              </RadioGroup>
            </Box>}
          </Collapse>
        </FormControl>
      );
    });
    singleIdsSelector = (
      <Box width="100%"><Stack>
        <Button size="small" width="100%" color="warning" 
          variant={openedSection === "singleIds" ? "contained" : "outlined"}
          sx={{textTransform: "none", textAlign: "left", justifyContent: "flex-start"}}
          className="chinese"
          onClick={() => {
            if (openedSection === "singleIds") {
              setOpenedSection(null);
            } else {
              setOpenedSection("singleIds");
            }
          }}
        >单曲选择</Button>
        <Collapse in={openedSection === "singleIds"}>
          <Box paddingTop={1} /><Box width="100%" paddingLeft={"2em"}>
          <Stack spacing={1}>
            {selectors}
          </Stack>
          </Box>
        </Collapse>
        </Stack></Box>
    )
  }
  return <Box width="100%" alignItems="flex-start" justifyItems="flex-start" alignContent="flex-start" textAlign="left" spacing={1}>
    <Stack spacing={1}>
      {cardPrefixSelector}
      {presetsSelector}
      {singleIdsSelector}
    </Stack>
  </Box>
}

export default MusicIdSelectPanel;
export { isCardPrefixValid };