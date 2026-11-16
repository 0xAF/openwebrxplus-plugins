(function () {
"use strict";

Plugins.ctcss_decoder._version = 1;
Plugins.ctcss_decoder.init = async function () {

    await new Promise(r => setTimeout(r, 500));

    function waitForAudio() {
        if (!audioEngine || !audioEngine.audioContext || !audioEngine.gainNode || !audioEngine.started) {
            setTimeout(waitForAudio, 400);
            return;
        }
        console.log("CTCSS READY");
        start();
    }

    function start() {
        const ctx = audioEngine.audioContext;

        const highpass = ctx.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 55;
        highpass.Q.value = 0.7;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = 270;
        lowpass.Q.value = 0.7;


        function findAudioTap(ctx) {
            const preferredNames = [
                "inputNode",
                "sourceNode",
                "source",
                "audioSource",
                "audioSourceNode",
                "demodulatorNode",
                "demodNode",
                "filterNode",
                "agcNode",
                "processorNode",
                "scriptNode",
                "workletNode",
                "outputNode"
            ];

            for (let i = 0; i < preferredNames.length; i++) {
                const node = audioEngine[preferredNames[i]];

                if (isAudioNode(node, ctx)) {
                    console.log("CTCSS audio tap:", preferredNames[i]);
                    return node;
                }
            }

            const seen = [];

            for (const key in audioEngine) {
                const node = audioEngine[key];

                if (key === "gainNode")
                    continue;

                if (isAudioNode(node, ctx)) {
                    seen.push(key);

                    if (typeof node.connect === "function" && node !== ctx.destination) {
                        console.log("CTCSS audio tap auto:", key);
                        return node;
                    }
                }
            }

            console.log("CTCSS audio tap fallback: gainNode", seen);
            return audioEngine.gainNode;
        }

        function isAudioNode(node, ctx) {
            return !!node &&
                typeof node.connect === "function" &&
                typeof node.disconnect === "function" &&
                node.context === ctx;
        }

        const tapNode = findAudioTap(ctx);
        tapNode.connect(highpass);
        highpass.connect(lowpass);

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 32768;
        analyser.smoothingTimeConstant = 0;
        lowpass.connect(analyser);

        const buf = new Float32Array(analyser.fftSize);
        const work = new Float32Array(analyser.fftSize);

        const TONES = [
            67.0,69.3,71.9,74.4,77.0,79.7,82.5,85.4,
            88.5,91.5,94.8,97.4,100.0,103.5,107.2,110.9,
            114.8,118.8,123.0,127.3,131.8,136.5,141.3,146.2,
            151.4,156.7,159.8,162.2,167.9,173.8,179.9,186.2,
            192.8,203.5,210.7,218.1,225.7,233.6,241.8,250.3
        ];

        const STATE_KEY = "ctcss_decoder_pos_v2";
        const AUTO_SQL_KEY = "ctcss_decoder_auto_sql";
        const LAST_TONE_KEY = "ctcss_decoder_last_tone";
        const LOCK_MIN = 7;
        const FIXED_MIN = 5;
        const MISS_LIMIT = 6;
        const LIVE_MIN_SCORE = 0.0000018;
        const LOCK_MIN_SCORE = 0.0000035;
        const LIVE_RATIO = 1.42;
        const LOCK_RATIO = 1.75;

        let running = false;
        let dc = 0;
        let warmup = 0;
        let lockTone = null;
        let lockCount = 0;
        let missCount = 0;
        let fixedTone = null;
        let candidateTone = null;
        let candidateCount = 0;
        let locked = false;
        let autoSql = localStorage.getItem(AUTO_SQL_KEY) !== "0";
        let noiseFloor = 0.0002;
        let lastTone = parseFloat(localStorage.getItem(LAST_TONE_KEY) || "0") || null;

        if (!document.getElementById("ctcss-box")) {
            const box = document.createElement("div");
            box.id = "ctcss-box";
            box.innerHTML = `
                <div id="ctcss-head">
                    <span class="ctcss-title">CTCSS</span>
                    <span class="ctcss-cell">FIXED <b id="ctcss-fixed">---</b></span>
                    <span class="ctcss-cell">LIVE <b id="ctcss-tone">---</b></span>
                    <span id="ctcss-lock">NO</span>
                </div>
                <div id="ctcss-sig-row">
                    <span>SIG <b id="ctcss-signal">0</b></span>
                    <span>Q <b id="ctcss-quality">0</b></span>
                    <span>LAST <b id="ctcss-last">---</b></span>
                </div>
                <div id="ctcss-bar-row"><div id="ctcss-track"><div id="ctcss-bar"></div></div></div>
                <div id="ctcss-bottom">
                    <label id="ctcss-sql-row"><span>SQL</span><input id="ctcss-sql" type="range" min="0" max="0.008" step="0.00005" value="0.00045"></label>
                    <button id="ctcss-auto">AUTO</button>
                    <button id="ctcss-btn">START</button>
                </div>
            `;

            const style = document.createElement("style");
            style.id = "ctcss-style";
            style.textContent = `
                #ctcss-box{position:fixed;left:510px;top:31px;z-index:999999;width:190px;height:70px;box-sizing:border-box;padding:4px 6px;border:0;border-radius:0;background:rgba(48,50,52,.88);color:#f0f2f3;font:8px/1.05 Arial,Helvetica,sans-serif;box-shadow:none;user-select:none;-webkit-user-select:none;touch-action:none;overflow:hidden}
                #ctcss-head{display:grid;grid-template-columns:31px 47px 41px 1fr;align-items:start;gap:4px;height:21px;cursor:move;letter-spacing:0}
                .ctcss-title{font-weight:700;color:#fff;line-height:10px;text-shadow:0 1px 1px #000}
                .ctcss-cell{font-weight:700;color:#fff;line-height:10px;white-space:nowrap;text-shadow:0 1px 1px #000}
                .ctcss-cell b{display:block;margin-top:1px;font-size:8px;line-height:9px;color:#00f060;font-weight:700;text-shadow:none}
                #ctcss-tone{color:#ffd244}
                #ctcss-lock{justify-self:end;color:#8bffbe;font-size:8px;line-height:10px;font-weight:700;text-shadow:0 1px 1px #000}
                #ctcss-sig-row{display:grid;grid-template-columns:58px 34px 1fr;align-items:center;gap:4px;height:11px;color:#fff;font-weight:700;text-shadow:0 1px 1px #000}
                #ctcss-signal,#ctcss-quality{color:#74caff;font-weight:700;text-shadow:none}
                #ctcss-last{color:#00f060;font-weight:700;text-shadow:none}
                #ctcss-bar-row{height:5px;margin:1px 0 0}
                #ctcss-track{height:3px;background:rgba(32,34,36,.85);overflow:hidden;border-radius:1px}
                #ctcss-bar{height:3px;width:0%;background:#00e869}
                #ctcss-bottom{display:grid;grid-template-columns:1fr 28px 38px;align-items:center;gap:4px;height:22px;margin-top:0}
                #ctcss-sql-row{display:grid;grid-template-columns:24px 1fr;align-items:center;gap:3px;color:#fff;font-weight:700;text-shadow:0 1px 1px #000}
                #ctcss-sql{width:100%;height:10px;margin:0;accent-color:#d6d9dc}
                #ctcss-btn,#ctcss-auto{height:13px;border:0;background:transparent;color:#00ff66;font-weight:700;font-size:8px;line-height:13px;padding:0;cursor:pointer;text-align:center}
                #ctcss-auto{color:#74caff}
            `;

            document.head.appendChild(style);
            document.body.appendChild(box);
            restorePosition(box);
            makeDraggable(box, document.getElementById("ctcss-head"));
        }

        const box = document.getElementById("ctcss-box");
        const lockEl = document.getElementById("ctcss-lock");
        const fixedEl = document.getElementById("ctcss-fixed");
        const toneEl = document.getElementById("ctcss-tone");
        const sigEl = document.getElementById("ctcss-signal");
        const qualityEl = document.getElementById("ctcss-quality");
        const lastEl = document.getElementById("ctcss-last");
        const barEl = document.getElementById("ctcss-bar");
        const sqlEl = document.getElementById("ctcss-sql");
        const autoBtn = document.getElementById("ctcss-auto");
        const btn = document.getElementById("ctcss-btn");

        updateAutoButton();
        updateLastTone();

        restorePosition(box);
        makeDraggable(box, document.getElementById("ctcss-head"));

        function restorePosition(el) {
            try {
                const saved = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
                if (!saved) return;
                el.style.left = Math.max(0, Math.min(saved.left, window.innerWidth - el.offsetWidth)) + "px";
                el.style.top = Math.max(0, Math.min(saved.top, window.innerHeight - el.offsetHeight)) + "px";
            } catch (e) {
                console.warn("CTCSS position restore failed", e);
            }
        }

        function makeDraggable(el, handle) {
            if (!el || !handle || handle.dataset.dragReady) return;
            handle.dataset.dragReady = "1";
            let drag = null;

            handle.addEventListener("pointerdown", event => {
                event.preventDefault();
                drag = { x: event.clientX, y: event.clientY, left: el.offsetLeft, top: el.offsetTop };
                handle.setPointerCapture(event.pointerId);
            });

            handle.addEventListener("pointermove", event => {
                event.preventDefault();
                if (!drag) return;
                const maxLeft = Math.max(0, window.innerWidth - el.offsetWidth);
                const maxTop = Math.max(0, window.innerHeight - el.offsetHeight);
                el.style.left = Math.max(0, Math.min(maxLeft, drag.left + event.clientX - drag.x)) + "px";
                el.style.top = Math.max(0, Math.min(maxTop, drag.top + event.clientY - drag.y)) + "px";
            });

            
            handle.addEventListener("touchmove", e=>{ if(drag) e.preventDefault(); }, {passive:false});

            function finishDrag() {
                if (!drag) return;
                drag = null;
                localStorage.setItem(STATE_KEY, JSON.stringify({ left: el.offsetLeft, top: el.offsetTop }));
            }

            handle.addEventListener("pointerup", finishDrag);
            handle.addEventListener("pointercancel", finishDrag);
        }

        function resetLock(clearFixed) {
            lockTone = null;
            lockCount = 0;
            missCount = 0;
            candidateTone = null;
            candidateCount = 0;
            locked = false;
            lockEl.textContent = "NO";
            lockEl.style.color = "#9aa0a5";
            toneEl.textContent = "---";
            toneEl.style.color = "#ffd244";
            barEl.style.width = "0%";
            if (qualityEl) {
                qualityEl.textContent = "0";
                qualityEl.style.color = "#74caff";
            }

            if (clearFixed) {
                fixedTone = null;
                fixedEl.textContent = "---";
            }
        }

        function updateAutoButton() {
            if (!autoBtn)
                return;

            autoBtn.textContent = autoSql ? "AUTO" : "MAN";
            autoBtn.style.color = autoSql ? "#74caff" : "#d7dce2";
            sqlEl.disabled = autoSql;
            sqlEl.style.opacity = autoSql ? "0.62" : "1";
        }

        function updateLastTone() {
            if (!lastEl)
                return;

            lastEl.textContent = lastTone ? lastTone.toFixed(1) : "---";
        }

        function updateQuality(result, isLocked) {
            if (!qualityEl)
                return;

            const spread = Math.max(0, result.ratio - LIVE_RATIO);
            const ratioPart = Math.min(72, spread * 32);
            const scorePart = Math.min(28, result.score * 2200000);
            const q = Math.max(0, Math.min(99, Math.round(ratioPart + scorePart)));

            qualityEl.textContent = String(q);
            qualityEl.style.color = isLocked ? "#00f060" : (q >= 45 ? "#ffd244" : "#74caff");
        }

        function currentSql(max, rms) {
            if (!autoSql)
                return parseFloat(sqlEl.value);

            if (!locked && !lockTone) {
                noiseFloor = noiseFloor * 0.985 + Math.max(rms, max * 0.22) * 0.015;
            }

            const next = Math.max(0.00012, Math.min(0.0032, noiseFloor * 2.7));
            sqlEl.value = next.toFixed(5);
            return next;
        }

        autoBtn.onclick = () => {
            autoSql = !autoSql;
            localStorage.setItem(AUTO_SQL_KEY, autoSql ? "1" : "0");
            updateAutoButton();
        };

        function preprocessBlock(input, output) {
            let max = 0;
            let energy = 0;
            for (let i = 0; i < input.length; i++) {
                dc = dc * 0.995 + input[i] * 0.005;
                const v = input[i] - dc;
                output[i] = v;
                const a = Math.abs(v);
                if (a > max) max = a;
                energy += v * v;
            }
            return { max: max, rms: Math.sqrt(energy / input.length) };
        }

        function goertzel(samples, freq, sr) {
            const n = samples.length;
            const omega = 2 * Math.PI * freq / sr;
            const coeff = 2 * Math.cos(omega);
            let q0 = 0;
            let q1 = 0;
            let q2 = 0;
            let windowEnergy = 0;

            for (let i = 0; i < n; i++) {
                const win = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
                const sample = samples[i] * win;
                q0 = coeff * q1 - q2 + sample;
                q2 = q1;
                q1 = q0;
                windowEnergy += sample * sample;
            }

            const power = q1 * q1 + q2 * q2 - coeff * q1 * q2;
            return power / Math.max(windowEnergy * n, 1e-18);
        }

        function detect(samples) {
            let best = 0;
            let second = 0;
            let tone = null;

            for (let i = 0; i < TONES.length; i++) {
                const score = goertzel(samples, TONES[i], ctx.sampleRate);
                if (score > best) {
                    second = best;
                    best = score;
                    tone = TONES[i];
                } else if (score > second) {
                    second = score;
                }
            }

            const ratio = best / Math.max(second, 1e-18);
            return {
                tone: ratio >= LIVE_RATIO && best >= LIVE_MIN_SCORE ? tone : null,
                score: best,
                ratio: ratio,
                lockable: ratio >= LOCK_RATIO && best >= LOCK_MIN_SCORE
            };
        }

        btn.onclick = () => {
            running = !running;
            if (running) {
                btn.textContent = "STOP";
                btn.style.color = "#ff4c4c";
                warmup = 0;
                resetLock(false);
            } else {
                btn.textContent = "START";
                btn.style.color = "#00ff66";
                resetLock(false);
            }
        };

        setInterval(() => {
            if (!running) return;

            analyser.getFloatTimeDomainData(buf);
            const level = preprocessBlock(buf, work);
            const max = level.max;
            const rms = level.rms;
            sigEl.textContent = max.toFixed(5);

            const sql = currentSql(max, rms);
            if (max < sql || rms < sql * 0.28) {
                resetLock(false);
                return;
            }

            if (warmup < 3) {
                warmup++;
                toneEl.textContent = "WARM";
                toneEl.style.color = "#ffd244";
                return;
            }

            const result = detect(work);
            const strength = Math.min(100, Math.max(0, result.score * 900000));
            barEl.style.width = strength.toFixed(0) + "%";
            updateQuality(result, locked);

            if (result.tone) {
                toneEl.textContent = result.tone.toFixed(1);
                toneEl.style.color = locked && lockTone === result.tone ? "#00f060" : "#ffd244";

                if (result.lockable) {
                    if (candidateTone === result.tone) candidateCount++;
                    else {
                        candidateTone = result.tone;
                        candidateCount = 1;
                    }

                    if (lockTone === result.tone) lockCount++;
                    else if (candidateCount >= 2) {
                        lockTone = result.tone;
                        lockCount = 1;
                    }

                    missCount = 0;

                    if (lockTone === result.tone && lockCount >= LOCK_MIN) {
                        locked = true;
                        lockEl.textContent = "LOCK";
                        lockEl.style.color = "#00ff66";
                        toneEl.style.color = "#00f060";

                        if (candidateCount >= FIXED_MIN && fixedTone !== result.tone) {
                            fixedTone = result.tone;
                            fixedEl.textContent = fixedTone.toFixed(1);
                            lastTone = fixedTone;
                            localStorage.setItem(LAST_TONE_KEY, lastTone.toFixed(1));
                            updateLastTone();
                        }
                    }
                } else {
                    missCount++;
                }
            } else {
                missCount++;
                toneEl.textContent = "---";
                toneEl.style.color = "#ffd244";
            }

            if (missCount >= MISS_LIMIT) {
                lockTone = null;
                lockCount = 0;
                candidateTone = null;
                candidateCount = 0;
                locked = false;
                lockEl.textContent = "NO";
                lockEl.style.color = "#9aa0a5";
            }
        }, 100);
    }

    waitForAudio();
    return true;
};

})();

// Mobile compatibility placeholder: pointer/touch handling reviewed for Samsung Internet & Firefox Mobile.
