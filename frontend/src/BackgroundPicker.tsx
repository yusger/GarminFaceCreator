import { useRef, useState, useEffect } from "react";
import { readBackground, type BackgroundChoice } from "./background";
const colors = [
  "#000000",
  "#09121A",
  "#FFFFFF",
  "#102D3A",
  "#182C24",
  "#2B163A",
  "#3A1722",
  "#362919",
];
export default function BackgroundPicker({
  value,
  onChange,
  onBusy,
}: {
  value: BackgroundChoice;
  onChange: (value: BackgroundChoice) => void;
  onBusy?: (busy: boolean) => void;
}) {
  const [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return (
    <div className="background-picker">
      <label>
        背景方式
        <select
          aria-label="背景方式"
          value={value.mode}
          onChange={(e) =>
            onChange({
              ...value,
              mode: e.target.value as BackgroundChoice["mode"],
            })
          }
        >
          <option value="auto">跟随模板或AI设计</option>
          <option value="solid">纯色背景</option>
          <option value="image">本地图片背景</option>
        </select>
      </label>
      {value.mode !== "auto" && (
        <>
          <div className="background-swatches">
            {colors.map((color) => (
              <button
                type="button"
                key={color}
                aria-label={"背景色 " + color}
                title={color}
                style={{
                  background: color,
                  width: 26,
                  height: 26,
                  border: "1px solid #678",
                  borderRadius: 5,
                }}
                onClick={() => onChange({ ...value, color })}
              />
            ))}
          </div>
          <label>
            背景颜色
            <input
              aria-label="背景颜色"
              type="color"
              value={value.color}
              onChange={(e) => onChange({ ...value, color: e.target.value })}
            />
          </label>
        </>
      )}
      {value.mode === "solid" && (
        <p className="hint">
          背景与前景配色独立；选择浅色背景后，可在编辑器调整文字颜色。
        </p>
      )}
      {value.mode === "image" && (
        <>
          <label>
            选择背景图片
            <input
              aria-label="选择背景图片"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                onBusy?.(true);
                setError("");
                try {
                  const image = await readBackground(file);
                  if (alive.current) onChange({ ...value, image });
                } catch (error) {
                  if (alive.current) setError((error as Error).message);
                } finally {
                  if (alive.current) onBusy?.(false);
                }
              }}
            />
          </label>
          {value.image && (
            <img
              width="100"
              height="100"
              src={value.image}
              alt="背景图片预览"
            />
          )}
          <p className="hint">
            图片居中裁剪为正方形，息屏隐藏。图片保存在浏览器中；主动编译时才随工程提交，不会自动发送给模型。
          </p>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
