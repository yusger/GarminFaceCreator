import { providers } from "./providers";
import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Copy,
  RotateCcw,
  Eye,
  EyeOff,
  Check,
  Plug,
  Zap,
  ChevronDown,
} from "lucide-react";
import { uid, type Profile } from "./domain";
import { storeProfiles } from "./storage";
import { testProfile, listModels } from "./api";
export default function Models({
  profiles,
  onSave,
  onBack,
}: {
  profiles: Profile[];
  onSave: (p: Profile[]) => void;
  onBack: () => void;
}) {
  const make = (): Profile => ({
    id: uid(),
    name: "默认代码模型",
    url: "https://api.example.com/v1",
    model: "",
    key: "",
    remember: false,
    temperature: 0.2,
    tokens: 8192,
  });
  const [drafts, setDrafts] = useState<Profile[]>(() =>
    profiles.length ? structuredClone(profiles) : [make()],
  );
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState("尚未测试连接");
  const [busy, setBusy] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const p = drafts[index];
  const provider =
    providers.find((x) => x.id === p.provider) ||
    providers.find((x) => x.url && p.url.replace(/\/$/, "") === x.url) ||
    providers[0];
  const choices = [...new Set([...provider.models, ...models])];

  function patch(v: Partial<Profile>) {
    setDrafts(drafts.map((x, i) => (i === index ? { ...x, ...v } : x)));
    setStatus("配置已修改，尚未测试");
  }
  async function test(list = false) {
    setBusy(true);
    setStatus(list ? "正在获取模型列表…" : "正在测试连接…");
    try {
      if (!p.url || (!list && !p.model))
        throw Error("请填写 API 地址和模型 ID");
      if (list) {
        setModels(await listModels(p));
        setStatus("模型列表已获取，仍需测试生成接口");
      } else {
        await testProfile(p);
        setStatus("连接成功，模型已响应");
      }
    } catch (e) {
      setStatus(
        e instanceof TypeError
          ? "网络或跨域错误，请检查服务是否允许浏览器直连"
          : String((e as Error).message),
      );
    } finally {
      setBusy(false);
    }
  }
  function save() {
    try {
      if (drafts.some((x) => !x.name.trim())) throw Error("配置名称不能为空");
      storeProfiles(drafts);
      onSave(drafts);
      setStatus("配置已保存到本机浏览器");
    } catch (e) {
      setStatus((e as Error).message);
    }
  }
  return (
    <main className="settings">
      <div className="page-heading">
        <div>
          <h1>模型配置</h1>
          <p>连接自己的模型，让设计成为可运行的表盘。</p>
        </div>
        <button onClick={onBack}>
          <ArrowLeft size={16} />
          返回编辑器
        </button>
      </div>
      <div className="profile-cards">
        {drafts.map((x, i) => (
          <button
            key={x.id}
            className={"profile-card " + (i === index ? "selected" : "")}
            onClick={() => {
              setIndex(i);
              setStatus("尚未测试连接");
              setModels([]);
            }}
          >
            <div>
              <Zap size={18} />
              <b>{x.name}</b>
              {i === 0 && <small>默认</small>}
            </div>
            <span className="muted">
              ● {x.key ? "已填写密钥，未验证" : "未配置密钥 / 本地服务可留空"}
            </span>
          </button>
        ))}
        <button
          className="profile-card dashed"
          onClick={() => {
            setDrafts([
              ...drafts,
              { ...make(), name: "新模型 " + (drafts.length + 1) },
            ]);
            setIndex(drafts.length);
            setStatus("尚未测试连接");
          }}
        >
          <Plus size={18} />
          新增配置
        </button>
      </div>
      <section className="form-card">
        <div className="section-heading">
          <h3>
            <Plug size={18} />
            {p.name} · 连接配置
          </h3>
          <div>
            <button
              onClick={() => {
                setDrafts([
                  ...drafts,
                  {
                    ...p,
                    id: uid(),
                    name: p.name + " 副本",
                    key: "",
                    remember: false,
                  },
                ]);
                setIndex(drafts.length);
              }}
            >
              <Copy size={14} />
              复制
            </button>
            <button
              onClick={() => {
                if (confirm("重置当前配置？")) patch({ ...make(), id: p.id });
              }}
            >
              <RotateCcw size={14} />
              重置
            </button>
          </div>
        </div>
        <div className="form-grid">
          <label>
            模型服务商
            <select
              aria-label="模型服务商"
              value={provider.id}
              onChange={(e) => {
                const next = providers.find((x) => x.id === e.target.value)!;
                setModels([]);
                patch({
                  provider: next.id,
                  thinking: false,
                  name: next.id === "custom" ? p.name : next.name,
                  url: next.url,
                  model: next.models[0] || "",
                  key: "",
                  remember: false,
                });
              }}
            >
              {providers.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            预设模型
            <select
              aria-label="预设模型"
              value={choices.includes(p.model) ? p.model : "__custom"}
              onChange={(e) =>
                patch({
                  model: e.target.value === "__custom" ? "" : e.target.value,
                })
              }
            >
              {choices.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
              <option value="__custom">自定义模型 ID</option>
            </select>
          </label>
          <label>
            配置名称
            <input
              value={p.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>
          <label>
            接口协议
            <select>
              <option>Chat Completions 兼容</option>
            </select>
          </label>
          <label>
            Base URL
            <input
              placeholder="https://api.example.com/v1"
              value={p.url}
              onChange={(e) =>
                patch({ url: e.target.value, provider: "custom" })
              }
            />
          </label>
          <label>
            API Key
            <div className="input-action">
              <input
                autoComplete="off"
                type={show ? "text" : "password"}
                placeholder="输入 API Key（本地服务可留空）"
                value={p.key}
                onChange={(e) => patch({ key: e.target.value })}
              />
              <button
                aria-label="显示或隐藏密钥"
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="inline">
              <input
                type="checkbox"
                checked={p.remember}
                onChange={(e) => patch({ remember: e.target.checked })}
              />
              记住密钥 <small>否则仅当前会话使用</small>
            </span>
          </label>
          <label>
            默认模型 ID
            <div className="input-action">
              <input
                list="model-list"
                placeholder="输入模型名称"
                value={p.model}
                onChange={(e) => patch({ model: e.target.value })}
              />
              <button disabled={busy} onClick={() => test(true)}>
                获取列表
              </button>
            </div>
            <datalist id="model-list">
              {choices.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>
          <div className="test-action">
            <button disabled={busy} onClick={() => test()}>
              <Plug size={16} />
              {busy ? "请求中…" : "测试连接"}
            </button>
            <span className="muted">浏览器直连</span>
          </div>
        </div>
      </section>
      <section className="form-card">
        <h3>
          <Zap size={18} />
          生成与请求选项
        </h3>
        <div className="form-grid">
          <label>
            生成上下文
            <select>
              <option>设计 JSON、固定规范与资源清单</option>
            </select>
          </label>
          <label>
            请求方式
            <select>
              <option>浏览器直连（后端仅编译）</option>
            </select>
          </label>
          <label>
            温度
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={p.temperature}
              onChange={(e) => patch({ temperature: Number(e.target.value) })}
            />
          </label>
          <label>
            最大输出 Token
            <input
              type="number"
              min="256"
              max="65536"
              value={p.tokens}
              onChange={(e) => patch({ tokens: Number(e.target.value) })}
            />
          </label>
        </div>
        {provider.id === "deepseek" && (
          <label>
            <input
              type="checkbox"
              aria-label="DeepSeek 深度思考"
              checked={!!p.thinking}
              onChange={(e) => patch({ thinking: e.target.checked })}
            />
            DeepSeek 深度思考（默认关闭，开启后可能需要更长时间）
          </label>
        )}
        <p className="hint">
          <ChevronDown size={14} />
          首版采用非流式生成，修复可手动重试。原生协议、外部代理和自定义请求头后续接入。
        </p>
      </section>
      <div className="settings-footer">
        <span className="connection" role="status">
          ● {status}
        </span>
        <div>
          <button
            disabled={drafts.length === 1}
            onClick={() => {
              if (confirm("删除当前配置？")) {
                setDrafts(drafts.filter((_, i) => i !== index));
                setIndex(0);
              }
            }}
          >
            删除配置
          </button>
          <button
            onClick={() => {
              if (index > 0) {
                setDrafts([p, ...drafts.filter((_, i) => i !== index)]);
                setIndex(0);
              }
            }}
          >
            设为默认
          </button>
          <button
            onClick={() => {
              if (confirm("放弃未保存的修改并返回？")) onBack();
            }}
          >
            取消
          </button>
          <button className="primary" onClick={save}>
            <Check size={16} />
            保存配置
          </button>
        </div>
      </div>
      <p className="hint">
        模型配置只保存在本机浏览器，不包含在项目导出中。填写 Key
        不等于连接测试通过。选择服务商会自动填写地址与默认模型，并清空原密钥。预设不代表账号一定有权限，可获取实时列表或填写自定义模型
        ID。
      </p>
    </main>
  );
}
