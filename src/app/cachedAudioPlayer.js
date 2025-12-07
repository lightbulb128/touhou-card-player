import { useState, useRef, useEffect } from "react";

// onFetched(src) is called when the audio is fetched from remote
// onLoaded() is called when the audio is loaded into the audio element
const CachedAudioPlayer = ({ src, onFetched, onLoaded, globalRefs }) => {

  const prepared = useRef({})
  const [currentSrc, setCurrentSrc] = useState("");
  const currentSrcRef = useRef(currentSrc);
  let audioRef = globalRefs.audioRef;

  useEffect(() => {
    currentSrcRef.current = currentSrc;
  }, [currentSrc]);

  function prepareAudio(src) {
    if (prepared.current[src]) {
      return;
    }
    prepared.current[src] = "fetching";
    fetch(src, { cache: "force-cache" }).then(async response => {
      if (!response.ok) {
        prepared.current[src] = null;
        return;
      }
      let reader = response.body.getReader();
      let chunks = [];
      let done = false;
      let totalSize = 0;
      while (!done) {
        const { done: _done, value } = await reader.read();
        if (value) {
          totalSize += value.length;
          chunks.push(value);
        }
        done = _done;
      }
      // concat chunks
      let concatenatedData = new Uint8Array(totalSize);
      let offset = 0;
      chunks.forEach(chunk => {
        concatenatedData.set(chunk, offset);
        offset += chunk.length;
      });
      prepared.current[src] = new Blob([concatenatedData], { type: "audio/mpeg" });
      if (currentSrcRef.current === src) {
        audioRef.current.src = URL.createObjectURL(prepared.current[src]);
        onFetched(src);
      }
    })
  }

  useEffect(() => {
    if (src !== currentSrc) {
      setCurrentSrc(src);
      if (prepared.current[src] && prepared.current[src] !== "fetching") {
        audioRef.current.src = URL.createObjectURL(prepared.current[src]);
        onFetched(src);
      } else {
        prepareAudio(src);
      }
    }
  }, [src, currentSrc, onFetched]);

  return [
    <div key={0}>
      <audio
        ref={audioRef}
        onLoadedData={() => {
          onLoaded();
        }}
      />
    </div>
  ]
};

export default CachedAudioPlayer;