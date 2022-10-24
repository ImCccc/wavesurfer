import { useCallback, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import Cursor from "wavesurfer.js/src/plugin/cursor";
import Timeline from "wavesurfer.js/src/plugin/timeline";
import Regions, { RegionParams } from "wavesurfer.js/src/plugin/regions";
import "./App.css";

const wave_backgroundColor = "rgba(0, 0, 0, 0)"; // 背景颜色

const wave_cursorColor = "rgba(0, 0, 0, 0)"; // 时间指针的颜色
const wave_play_cursorColor = "rgba(0, 0, 0, 1)"; // 播放时, 时间指针的颜色

const wave_waveColor = "green"; // 未播放那些波形的颜色
const wave_progressColor = "green"; // 已经播放那些波形的颜色

const range_backgroundColor = "rgba(0, 0, 0, 0.1)"; // 默认时间段的背景颜色
const range_choose_backgroundColor = "rgba(92, 172, 242, 0.2)"; // 选中时间段的背景颜色

// 鼠标移上去, 显示时间文本的样式
const customShowTimeStyle = {
  color: "#fff",
  padding: "4px",
  "font-size": "10px",
  "background-color": "#000",
};

type RegionsProps = {
  id: string; // 区段id, 插件自动生成
  end: string; // 开始时间
  start: string; // 结束时间
};

function App() {
  const duration = useRef<number>(0);
  const wavesurfer = useRef<WaveSurfer>();
  const addAreaDom = useRef<any>();
  const timelineDom = useRef<any>();
  const wavesurferDom = useRef<any>();
  const [regionsList, setRegionsList] = useState<RegionsProps[]>([]);

  // 当前选中的时段 id
  const [chooseId, setChooseId] = useState<string>();

  // 当前缩放
  const thisScal = useRef<number>(20);

  // 根据区间 Id 删除区间
  const deleteRegionById = useCallback(
    (id: string) => {
      if (!wavesurfer.current) return;
      wavesurfer.current.regions.list[id].remove();
      setRegionsList(regionsList?.filter((v) => v.id !== id));
      if (chooseId === id) setChooseId("");
    },
    [regionsList, chooseId]
  );

  // 播放区间音频
  const playById = useCallback((id: string) => {
    if (!wavesurfer.current) return;
    wavesurfer.current.regions.list[id].play();
  }, []);

  const chooseRegion = useCallback(
    (id: string) => {
      if (chooseId === id) return;
      if (!wavesurfer.current) return;

      const thisRegion = wavesurfer.current.regions.list[id];
      if (thisRegion) {
        thisRegion.element.style.backgroundColor = range_choose_backgroundColor;
      }

      // 取消上一个选中
      if (chooseId) {
        const prevRegion = wavesurfer.current.regions.list[chooseId];
        prevRegion.element.style.backgroundColor = range_backgroundColor;
      }

      setChooseId(id);
    },
    [chooseId]
  );

  useEffect(() => {
    if (!wavesurferDom.current) return;

    if (!wavesurfer.current) {
      const thisWavesurfer = WaveSurfer.create({
        container: wavesurferDom.current,
        waveColor: wave_waveColor,
        cursorColor: wave_cursorColor,
        progressColor: wave_progressColor,
        backgroundColor: wave_backgroundColor,
        cursorWidth: 1,
        barWidth: 1, // 波形为柱形

        // normalize: true,
        // scrollParent: true, // 波形是否滚动, false 波形缩小到容器的宽度
        // hideScrollbar: true, // 隐藏滚动条
        // forceDecode: true,

        plugins: [
          Regions.create({}),
          Timeline.create({
            // height: 15,
            container: timelineDom.current,
            primaryColor: "blue",
            secondaryColor: "red",
            primaryFontColor: "blue",
            secondaryFontColor: "red",
          }),
          Cursor.create({
            opacity: "1",
            showTime: true,
            customShowTimeStyle,
          }),
        ],
      });
      wavesurfer.current = thisWavesurfer;
      thisWavesurfer.load("./wavesurfer.mp3");

      // 准备好了, 获取时长
      thisWavesurfer.on("ready", function () {
        duration.current = thisWavesurfer.getDuration();
        const _minPxPerSec = thisWavesurfer.params.minPxPerSec;
        thisScal.current = _minPxPerSec;
        thisWavesurfer.zoom(_minPxPerSec);
      });

      // 播放时, 设置时间进度条
      thisWavesurfer.on("play", () => {
        thisWavesurfer.setCursorColor(wave_play_cursorColor);
      });

      // 结束播放, 取消时间进度条
      thisWavesurfer.on("pause", () => {
        thisWavesurfer.setCursorColor(wave_cursorColor);
      });
    }

    const _updateRegion = (region: Required<RegionParams>) => {
      const updateItem = regionsList.find((item) => item.id === region.id);
      if (!updateItem) return;
      updateItem.start = region.start.toFixed(2);
      updateItem.end = region.end.toFixed(2);
      setRegionsList([...regionsList]);

      // 拖拽过程中, 会取消选中, 需要重新选中
      if (chooseId && wavesurfer.current) {
        const prevRegion = wavesurfer.current.regions.list[chooseId];
        if (prevRegion) {
          prevRegion.element.style.backgroundColor =
            range_choose_backgroundColor;
        }
      }
    };

    const _createRegion = (region: Required<RegionParams>) => {
      const img = document.createElement("img");
      img.className = "delete-icon";
      img.src = "/delete.svg";
      img.setAttribute("data-id", region.id);
      const dom = document.querySelector(`[data-id="${region.id}"]`);
      dom?.appendChild(img);
      regionsList.push({
        id: region.id,
        end: region.end.toFixed(2),
        start: region.start.toFixed(2),
      });
      setRegionsList([...regionsList]);
    };

    const _onClick = (e: any) => {
      if (!wavesurfer.current) return;
      wavesurfer.current.stop();
      if (e.target.className.includes("delete-icon")) {
        const id = e.target.getAttribute("data-id");
        return deleteRegionById(id);
      }
    };

    wavesurfer.current.on("region-created", _createRegion);
    wavesurfer.current.on("region-update-end", _updateRegion);
    wavesurferDom.current.addEventListener("click", _onClick);
    return () => {
      if (!wavesurfer.current) return;
      wavesurfer.current.un("region-created", _createRegion);
      wavesurfer.current.un("region-update-end", _updateRegion);
      wavesurferDom.current.removeEventListener("click", _onClick);
    };
  }, [regionsList, deleteRegionById, chooseId]);

  useEffect(() => {
    if (!addAreaDom.current) return;
    if (!wavesurferDom.current) return;

    const areaDom = addAreaDom.current as HTMLDivElement;
    const waveformDom = wavesurferDom.current as HTMLDivElement;

    let _saveX: number | undefined;
    let _thisEnd: number | undefined;
    let _thisStart: number | undefined;

    const getTimes = () => {
      const times = waveformDom.querySelector("showtitle")?.textContent || "";
      const interval = times.split(":");
      let hour = 0;
      let minute = 0;
      let second = 0;
      if (interval.length === 3) {
        minute = +interval[0];
        second = +interval[1];
      }
      if (interval.length === 4) {
        hour = +interval[0];
        minute = +interval[1];
        second = +interval[2];
      }
      return hour * 3600 + minute * 60 + second;
    };

    // 鼠标按下
    waveformDom.addEventListener("mousedown", (ev) => {
      _saveX = ev.clientX;
      areaDom.style.width = "1px";
      areaDom.style.left = `${_saveX - 20}px`;
      _thisStart = getTimes();
      // setTimeout(() => {
      //   console.log(wavesurfer.current?.getCurrentTime());
      // }, 1000);
    });

    // 鼠标移动
    waveformDom.addEventListener("mousemove", (ev) => {
      if (!_saveX || !_thisStart) return;
      const offsetX = ev.clientX - _saveX;
      if (offsetX > 0) {
        areaDom.style.width = offsetX + "px";
      } else {
        _thisEnd = undefined;
        _thisStart = undefined;
      }
    });

    // 鼠标抬起
    waveformDom.addEventListener("mouseup", () => {
      _thisEnd = getTimes();
      if (!_thisEnd || !_thisStart || _thisEnd === _thisStart) return;
      wavesurfer.current?.addRegion({
        start: Math.min(_thisEnd, _thisStart),
        end: Math.max(_thisEnd, _thisStart),
        loop: false,
        drag: true,
        resize: true,
        color: range_backgroundColor,
      });
    });

    // 滚轮放大缩小
    let scal = 1;
    waveformDom.addEventListener("mousewheel", (ev: any) => {
      const down = ev.wheelDelta < 0;
      if (down) {
        scal = Math.max(1, +(scal - 1).toFixed(2));
      } else {
        scal = +(scal + 1).toFixed(2);
      }
      const _wavesurfer = wavesurfer.current;
      if (!_wavesurfer) return;
      console.log(scal);
      _wavesurfer.zoom(scal);
    });

    // 窗口鼠标提起
    const _mouseup = () => {
      _saveX = undefined;
      areaDom.style.width = "0";
      areaDom.style.left = "0";
      _thisEnd = undefined;
      _thisStart = undefined;
    };

    // 鼠标抬起
    document.addEventListener("mouseup", _mouseup);

    return () => {
      document.removeEventListener("mouseup", _mouseup);
    };
  }, []);

  return (
    <div className="App">
      <div className="wave" ref={wavesurferDom}>
        <div ref={addAreaDom} className="add-area"></div>
      </div>
      <div ref={timelineDom}></div>

      <div className="top">
        <span className="title">已添加的时间分段：</span>
      </div>
      {regionsList.map((item, index) => {
        return (
          <div
            key={item.id}
            className="time-wrap"
            onClick={() => chooseRegion(item.id)}
            style={{
              backgroundColor:
                item.id === chooseId ? range_choose_backgroundColor : "",
            }}
          >
            <div className="title">{"时间分段" + (index + 1)}</div>
            <span>开始时间:</span>
            <input
              onChange={(e) => {
                if (!wavesurfer.current) return;
                const value = +e.target.value;
                if (value >= 0) {
                  const thisRegion = wavesurfer.current.regions.list[item.id];
                  const { start, end } = thisRegion;
                  // 偏移量
                  let updateTime = value - start;
                  // 不能超过结束时间
                  if (updateTime + start < end) {
                    thisRegion.onResize(updateTime, "start");
                  }
                }
                item.start = e.target.value;
                setRegionsList([...regionsList]);
              }}
              value={item.start}
              type="text"
            />
            <span>结束时间:</span>
            <input
              onChange={(e) => {
                if (!wavesurfer.current) return;
                const value = +e.target.value;
                if (value >= 0) {
                  const thisRegion = wavesurfer.current.regions.list[item.id];
                  const { start, end } = thisRegion;
                  // 偏移量
                  let updateTime = value - end;

                  // 不能超过结束
                  if (updateTime + end > duration.current) {
                    thisRegion.onResize(duration.current - end, "end");
                    item.end = duration.current.toFixed(2);
                    return setRegionsList([...regionsList]);
                  }

                  // 不能低于开始时间
                  if (updateTime + end > start) {
                    thisRegion.onResize(updateTime, "end");
                  }
                }
                item.end = e.target.value;
                setRegionsList([...regionsList]);
              }}
              value={item.end}
              type="text"
            />
            <button
              onClick={(e) => {
                playById(item.id);
                e.stopPropagation();
              }}
            >
              播放
            </button>
            <button
              onClick={(e) => {
                deleteRegionById(item.id);
                e.stopPropagation();
              }}
            >
              删除
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default App;
