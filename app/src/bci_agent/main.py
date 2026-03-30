"""BCI Agent MVP - main entry point."""
import os
import signal as sig
import time

from dotenv import load_dotenv

from .agent import build_graph
from .decoder import decode_intent
from .signal import SignalSource, extract_band_powers


def main():
    load_dotenv()

    print("=== BCI Agent MVP ===")
    print("BrainFlow Synthetic Board (模拟数据)")
    print("Ctrl+C 停止\n")

    if not os.environ.get("OPENAI_API_KEY"):
        print("[警告] 未设置 OPENAI_API_KEY，Agent 将无法调用 GLM")
        print("[提示] 复制 .env.example 为 .env 并填入你的智谱 API Key\n")

    source = SignalSource()
    graph = build_graph()
    last_state = "idle"

    running = True

    def on_exit(_sig, _frame):
        nonlocal running
        running = False

    sig.signal(sig.SIGINT, on_exit)

    source.start()
    time.sleep(1)  # Wait for buffer to fill
    print("[启动] 信号采集已开始\n")

    try:
        while running:
            # 1. Capture
            eeg = source.read(duration_s=1.0)
            if eeg.shape[1] < source.sampling_rate // 2:
                time.sleep(0.5)
                continue

            # 2. Process
            bands = extract_band_powers(eeg, source.sampling_rate)

            # 3. Decode
            intent = decode_intent(bands)

            # 4. Display
            print(
                f"[脑状态] {intent.state:8s} "
                f"(置信度: {intent.confidence:.0%}) | "
                f"α:{bands['alpha']:.3f} β:{bands['beta']:.3f} "
                f"θ:{bands['theta']:.3f} γ:{bands['gamma']:.3f}"
            )

            # 5. On meaningful state change -> invoke agent
            if (
                intent.state != last_state
                and intent.state != "idle"
                and intent.confidence >= 0.5
            ):
                print(f"\n>>> 意图: {intent.text}")
                try:
                    result = graph.invoke(
                        {
                            "brain_state": intent.state,
                            "confidence": intent.confidence,
                            "intent_text": intent.text,
                            "band_powers": bands,
                            "messages": [],
                            "response": "",
                        }
                    )
                    print(f"<<< Agent: {result['response']}\n")
                except Exception as e:
                    print(f"<<< Agent 错误: {e}\n")
                last_state = intent.state

            time.sleep(1)
    finally:
        source.stop()
        print("\n[停止] BCI Agent 已关闭")


if __name__ == "__main__":
    main()
