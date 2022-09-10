// BUILD: 61266
// MANGLE: 58882
// TERSER: 37629
// ROADROLL: 18444
// LZMA: 13713
// rem: -401

// BUILD: 59385
// MANGLE: 56967
// TERSER: 36679
// ROADROLL: 18285
// LZMA: 13584
// rem: -272

import {execSync} from "child_process";
import {copyFileSync, readFileSync, rmSync, writeFileSync} from "fs";

let report = [];
const files = ["public/c.js", "public/s.js", "public/index.html"];
const zipFolderFiles = ["zip/c.js", "zip/s.js", "zip/index.html"];//, "zip/r"];
const isProd = process.argv.indexOf("--dev") < 0;
const envDef = isProd ? "production" : "development";

function del(...files) {
    for (const file of files) {
        try {
            rmSync(file);
        } catch {
        }
    }
}

function sz(...files) {
    let total = 0;
    for (const file of files) {
        try {
            const bytes = readFileSync(file);
            total += bytes.length;
        } catch {
            console.warn("file not found:", file);
        }
    }
    return total;
}

del("game.zip");
del(...files);
del(...zipFolderFiles);

execSync(`html-minifier --collapse-whitespace --remove-comments --remove-optional-tags --remove-redundant-attributes --remove-script-type-attributes --remove-tag-whitespace --use-short-doctype --minify-css true --minify-js true -o public/index.html html/index.html`);
copyFileSync("html/debug.html", "public/debug.html");

const manglePropsRegex = "._$";
// execSync(`esbuild server/src/index.ts --bundle --minify --mangle-props=_$ --platform=node --target=node16 --format=esm --outfile=public/server.js`);
const esbuildArgs = [];
if (isProd) {
    // esbuildArgs.push("--minify");
    esbuildArgs.push("--drop:console");
    esbuildArgs.push("--drop:debugger");
    // esbuildArgs.push("--ignore-annotations");
    // esbuildArgs.push("--charset=utf8");
    // esbuildArgs.push("--tree-shaking=true");
    // esbuildArgs.push("--minify-whitespace");
    // esbuildArgs.push("--minify-identifiers");
    esbuildArgs.push("--minify-syntax");
    // esbuildArgs.push("--mangle-props=" + manglePropsRegex);
    //esbuildArgs.push("--analyze");
}

execSync(`esbuild server/src/index.ts --tsconfig=server/tsconfig.json ${esbuildArgs.join(" ")} --bundle --format=esm --define:process.env.NODE_ENV='\"${envDef}\"' --platform=node --target=node16 --outfile=public/s0.js --metafile=dump/server-build.json`, {
    encoding: "utf8",
    stdio: "inherit"
});
execSync(`esbuild src/lib/index.ts --tsconfig=tsconfig.json ${esbuildArgs.join(" ")} --bundle --format=esm --define:process.env.NODE_ENV='\"${envDef}\"' --outfile=public/c0.js --metafile=dump/client-build.json`, {
    encoding: "utf8",
    stdio: "inherit"
});
// copyFileSync("client.js", "public/c0.js");
// copyFileSync("server.js", "public/s0.js");

report.push("BUILD: " + sz("public/c0.js", "public/s0.js", "public/index.html"));

mangle_types("public/c0.js", "public/c1.js");
mangle_types("public/s0.js", "public/s1.js");
// copyFileSync("public/c0.js", "public/c1.js");
// copyFileSync("public/s0.js", "public/s1.js");

report.push("MANGLE: " + sz("public/c1.js", "public/s1.js", "public/index.html"));

const pureFunc = [
    // 'console.log',
    // 'console.warn',
    // 'console.info',
    // 'console.error',
    'M.sin',
    'M.cos',
    'M.sqrt',
    'M.hypot',
    'M.floor',
    'M.round',
    'M.ceil',
    'M.max',
    'M.min',
    'M.random',
    'M.abs',
    'reach',
    'lerp',
    'toRad',
    // 'getLumaColor32',
    'temper',
    'unorm_f32_from_u32',
    // 'newPointer',
];

const compress = [
    "booleans_as_integers=true",
    "unsafe_arrows=true",
    "passes=1000",
    "keep_fargs=false",
    "pure_getters=true",
    `pure_funcs=[${pureFunc.map(x => `'${x}'`).join(",")}]`,
    "unsafe_methods=true",
    //"expression=true",
    // "hoist_funs=true",
    "inline=3",
];//"unsafe=true",


let tl = "--toplevel";
execSync(`terser public/s1.js -f wrap_func_args=false ${tl} --module --ecma=2020 -c ${compress.join(",")} --mangle-props regex=/${manglePropsRegex}/ -m -o public/s.js`);
execSync(`terser public/c1.js -f wrap_func_args=false ${tl} --module --ecma=2020 -c ${compress.join(",")} --mangle-props regex=/${manglePropsRegex}/ -m -o public/c.js`);

report.push("TERSER: " + sz(...files));

rehashWebAPI("public/c.js", "public/c.js");

report.push("REHASH: " + sz(...files));

// debug.js
execSync(`esbuild src/lib/index.ts --bundle --format=esm --define:process.env.NODE_ENV='\"development\"' --outfile=public/debug.js`);
// rehashWebAPI("public/debug.js", "public/debug.js");

// function postprocess(file) {
//     let A = readFileSync(file, "utf8");
//     A = A.replaceAll(new RegExp("([^\\w_$]|^)(const\\s)", "gm"), (a, c1, c2) => {
//         return c1 + "let ";
//     });
//     writeFileSync(file, A, "utf8");
// }
//
// postprocess("public/c.js");
// postprocess("public/s.js");
// report.push("TERSER+: " + sz(...files));

console.info("release build ready... " + sz(...files));

if (process.argv.indexOf("--zip") > 0) {

    // Include only files you need! Do not include some hidden files like .DS_Store (6kb)
    // execSync(`zip -9 -X -D game.zip public/index.js public/server.js public/index.html`);
    // report.push("ZIP: " + sz("game.zip"));

    execSync(`roadroller -D -O2 -- public/c.js -o zip/c.js`);
    copyFileSync("public/s.js", "zip/s.js");
    copyFileSync("public/index.html", "zip/index.html");

    report.push("ROADROLL: " + sz(...zipFolderFiles));

    try {
        // https://linux.die.net/man/1/advzip
        // execSync(`advzip --not-zip --shrink-insane --recompress game.zip`);
        // advzip --not-zip --shrink-insane --iter=1000 --add game.zip zip/index.js zip/server.js zip/index.html
        // --not-zip
        execSync(`advzip --shrink-insane --iter=1000 --add game.zip ${zipFolderFiles.join(" ")}`);
        execSync(`advzip --list game.zip`);
        const zipSize = sz("game.zip");
        report.push("LZMA: " + zipSize);
        report.push("rem: " + (13 * 1024 - zipSize));
    } catch {
        console.warn("please install `advancecomp`");
    }
}

console.info(report.join("\n"));

function mangle_types(file, dest) {

    let src = readFileSync(file, "utf8");
    const getIDRegex = (from) => new RegExp("([^\\w_$]|^)(" + from + ")([^\\w_$]|$)", "gm");
    const _rename = new Map();
    let alphaSize = 0;

    const getAlphaID = i => `$${i}_`;
    const isRenamable = id => id.length > 1 && id.at(-1) === "_";

    function addType(fields) {

        const usedIds = new Set();
        for (const f of fields) {
            if (!isRenamable(f)) {
                usedIds.add(f);
            }
        }

        for (const f of fields) {
            if (isRenamable(f)) {
                const renamed = _rename.get(f);
                if (renamed) {
                    //console.info(f + " is used: " + renamed);
                    usedIds.add(renamed);
                }
            }
        }

        for (const f of fields) {
            if (isRenamable(f)) {
                let renamed = _rename.get(f);
                if (!renamed) {
                    let idx = 0;
                    while (usedIds.has(getAlphaID(idx))) {
                        idx++;
                        if (alphaSize < idx) {
                            alphaSize = idx;
                        }
                    }
                    const id = getAlphaID(idx);
                    _rename.set(f, id);
                    //console.info("replace: " + f + " to " + id);
                    usedIds.add(id);
                }
            }
        }
    }

    let archetypes = [
        [
            "id_",
            "pc_",
            "dc_",
            "name_",
            "debugPacketByteLength",
        ],
        [
            // WeaponConfig
            "rate_",
            "launchTime_",
            "relaunchSpeed_",
            "spawnCount_",
            "angleVar_",
            "angleSpread_",
            "kickBack_",
            "offset_",
            "offsetZ_",
            "velocity_",
            "velocityVar_",
            "cameraShake_",
            "detuneSpeed_",
            "cameraScale_",
            "cameraFeedback_",
            "cameraLookForward_",
            "gfxRot_",
            "gfxSx_",
            "handsAnim_",
            "bulletType_",
            "bulletDamage_",
            "bulletLifetime_",
            "bulletHp_",
            "bulletShellColor_",
        ],
        [
            "l_",
            "t_",
            "r_",
            "b_",
            "flags_",
            "pointer_",
            "r1_",
            "r2_",
        ],
        [
            "x_",
            "y_",
            "z_",
            "u_",
            "v_",
            "w_",
            "a_",
            "r_",
            "scale_",
            "color_",
            "lifeTime_",
            "lifeMax_",
            "img_",
            "splashSizeX_",
            "splashSizeY_",
            "splashEachJump_",
            "splashScaleOnVelocity_",
            "splashImg_",
            "followVelocity_",
            "followScale_",
        ],
        [
            // Actor
            "id_",
            "type_",
            "client_",
            "btn_",
            "weapon_",
            "hp_",
            "anim0_",
            "animHit_",
            "x_",
            "y_",
            "z_",
            "u_",
            "v_",
            "w_",
            "s_",
            "t_",
        ],
        [
            // Client
            "id_",
            "acknowledgedTic_",
            "tic_",
            "ready_",
            "isPlaying_"
        ],
        [
            // ClientEvent
            "tic_",
            "btn_",
            "client_",
        ],
        [
            // StateData
            "nextId_",
            "tic_",
            "seed_",
            "mapSeed_",
            "actors_",
            "scores_",
        ],
        [
            // Packet
            "sync_",
            "receivedOnSender_",
            "tic_",
            "events_",
            "state_",
            "debug",
        ],
        [
            // PacketDebug
            "seed",
            "tic",
            "nextId",
            "state",
        ],
        [
            // Pointer
            "id_",
            "startX_",
            "startY_",
            "x_",
            "y_",
            "downEvent_",
            "upEvent_",
            "active_",
        ],

        [
            // Texture
            "texture_",
            "w_",
            "h_",
            "x_",
            "y_",
            "u0_",
            "v0_",
            "u1_",
            "v1_",
            "fbo_",
        ],

        // GL renderer
        [
            "instancedArrays_",
            "quadCount_",
            "quadProgram_",
            "quadTexture_",
        ],

        // audio buffer source node
        [
            "currentSource_"
        ],

        // SERVER CONNECTION
        [
            "id_",
            "ts_",
            "eventStream_",
            "nextEventId_",
        ],
    ];
    for (let i = 0; i < archetypes.length; ++i) {
        archetypes[i] = archetypes[i].filter(a => findIdCount(a) > 0);
        archetypes[i].sort((a, b) => findIdCount(b) - findIdCount(a));
    }
    archetypes = archetypes.filter(a => a.length > 0);
    // solve unique fields
    const unique = new Set();
    const ntype = [];
    for (let i = 0; i < archetypes.length; ++i) {
        for (let j = 0; j < archetypes[i].length; ++j) {
            const id = archetypes[i][j];
            if (unique.has(id)) {
                ntype.push(id);
            } else {
                unique.add(id);
            }
        }
    }
    archetypes.unshift(ntype);

    for (const arch of archetypes) {
        addType(arch);
    }

    function findIdCount(id) {
        return isRenamable(id) ? (getIDRegex(id).exec(src)?.length ?? 0) : 0;
    }

    for (const [from, to] of _rename) {
        src = src.replaceAll(getIDRegex(from), (a, c1, c2, c3) => {
            // console.info(a + " => " + c1 + to + c3);
            return c1 + to + c3;
        });
    }
    console.info("Total used dict: " + alphaSize);

    writeFileSync(dest, src, "utf8");
}

function rehashWebAPI(file, dest) {
    let src = readFileSync(file, "utf8");
    let BASE32 = [];
    let SORTED_BASE32 = [];
    {
        const hist = new Map;
        for (let c of src) {
            if (/[a-zA-Z_$]/.test(c)) {
                hist.set(c, (hist.get(c) | 0) + 1);
            }
        }

        const list = [...hist];
        list.sort((a, b) => (b[1] - a[1]));
        for (const [c, n] of list) {
            if (BASE32.length < 32) {
                BASE32.push(c.charCodeAt(0));
            }
            //console.log(c + ": " + n);
        }
        //console.info(base32);
    }

    const reFieldID = (from) => new RegExp("([.])(" + from + ")([^\\w_$]|$)", "gm");

    const HASH_TABLE = {"baseLatency":"cu","outputLatency":"uf","close":"fR","createMediaElementSource":"Pr","createMediaStreamDestination":"sm","createMediaStreamSource":"$h","getOutputTimestamp":"am","resume":"tu","suspend":"em","destination":"Tt","currentTime":"b","sampleRate":"iw","listener":"Fa","onstatechange":"lP","createAnalyser":"wl","createBiquadFilter":"eo","createBuffer":"$C","createBufferSource":"xg","createChannelMerger":"tm","createChannelSplitter":"ei","createConstantSource":"tS","createConvolver":"dC","createDelay":"wf","createDynamicsCompressor":"_s","createGain":"ac","createIIRFilter":"hd","createOscillator":"g","createPanner":"dp","createPeriodicWave":"_t","createScriptProcessor":"sp","createStereoPanner":"Fy","createWaveShaper":"nS","decodeAudioData":"ht","audioWorklet":"pt","addEventListener":"gv","dispatchEvent":"Se","removeEventListener":"ua","canvas":"aR","drawingBufferWidth":"fv","drawingBufferHeight":"od","activeTexture":"ws","attachShader":"PR","bindAttribLocation":"du","bindRenderbuffer":"To","blendColor":"u","blendEquation":"P_","blendEquationSeparate":"es","blendFunc":"Cl","blendFuncSeparate":"pv","bufferData":"xS","bufferSubData":"oi","checkFramebufferStatus":"_P","compileShader":"vw","compressedTexImage2D":"Fo","compressedTexSubImage2D":"be","copyTexImage2D":"Tc","copyTexSubImage2D":"Fs","createFramebuffer":"gg","createProgram":"eh","createRenderbuffer":"Tv","createShader":"ji","createTexture":"el","cullFace":"aC","deleteBuffer":"pm","deleteFramebuffer":"ff","deleteProgram":"sh","deleteRenderbuffer":"Ro","deleteShader":"sa","deleteTexture":"$","depthFunc":"xu","depthMask":"ts","depthRange":"lo","detachShader":"jy","disable":"Pf","enable":"St","finish":"Sf","framebufferRenderbuffer":"ro","framebufferTexture2D":"Pn","frontFace":"xl","generateMipmap":"Co","getActiveAttrib":"$R","getActiveUniform":"_h","getAttachedShaders":"C_","getAttribLocation":"hR","getBufferParameter":"mp","getContextAttributes":"fu","getError":"oh","getExtension":"hn","getFramebufferAttachmentParameter":"Tf","getParameter":"it","getProgramInfoLog":"$f","getProgramParameter":"lh","getRenderbufferParameter":"oy","getShaderInfoLog":"ed","getShaderParameter":"rs","getShaderPrecisionFormat":"hu","getShaderSource":"So","getSupportedExtensions":"Cn","getTexParameter":"Sa","getUniform":"ge","getUniformLocation":"Tt","getVertexAttrib":"R","getVertexAttribOffset":"yo","isBuffer":"fw","isContextLost":"nu","isEnabled":"ar","isFramebuffer":"$_","isProgram":"mt","isRenderbuffer":"wn","isShader":"nc","isTexture":"fy","lineWidth":"Ai","linkProgram":"xr","pixelStorei":"jh","polygonOffset":"vS","readPixels":"Fn","renderbufferStorage":"cf","sampleCoverage":"Fg","shaderSource":"R_","stencilFunc":"RP","stencilFuncSeparate":"vu","stencilMask":"_e","stencilMaskSeparate":"i","stencilOp":"mu","stencilOpSeparate":"jR","texImage2D":"ri","texParameterf":"$c","texParameteri":"tc","texSubImage2D":"ft","useProgram":"fa","validateProgram":"dR","bindBuffer":"pr","bindFramebuffer":"fR","bindTexture":"Te","clearColor":"oC","clearDepth":"gP","clearStencil":"$g","colorMask":"a","disableVertexAttribArray":"vR","drawArrays":"wu","drawElements":"$e","enableVertexAttribArray":"rm","scissor":"Rf","uniform1f":"pl","uniform1fv":"jt","uniform1i":"cl","uniform1iv":"Ce","uniform2f":"Rt","uniform2fv":"py","uniform2i":"Pt","uniform2iv":"lS","uniform3f":"b_","uniform3fv":"cS","uniform3i":"$t","uniform3iv":"nC","uniform4f":"l_","uniform4fv":"ap","uniform4i":"n_","uniform4iv":"bi","uniformMatrix2fv":"po","uniformMatrix3fv":"$P","uniformMatrix4fv":"Rc","vertexAttrib1f":"js","vertexAttrib1fv":"wS","vertexAttrib2f":"os","vertexAttrib2fv":"TC","vertexAttrib3f":"ii","vertexAttrib3fv":"gs","vertexAttrib4f":"Cu","vertexAttrib4fv":"nn","vertexAttribPointer":"oa","viewport":"cv","drawingBufferColorSpace":"ew","unpackColorSpace":"te","makeXRCompatible":"nd","globalAlpha":"_f","globalCompositeOperation":"PP","imageSmoothingEnabled":"Ts","imageSmoothingQuality":"xy","strokeStyle":"aC","fillStyle":"re","shadowOffsetX":"op","shadowOffsetY":"rp","shadowBlur":"ey","shadowColor":"df","lineCap":"yP","lineJoin":"Sp","miterLimit":"rn","lineDashOffset":"bc","textAlign":"Fl","textBaseline":"nd","direction":"vw","fontKerning":"fw","fontStretch":"nn","fontVariantCaps":"nc","letterSpacing":"wh","textRendering":"CC","wordSpacing":"$d","createConicGradient":"ul","createImageData":"yS","createLinearGradient":"um","createPattern":"lu","createRadialGradient":"gv","drawFocusIfNeeded":"l","drawImage":"ca","fillText":"lS","getImageData":"ua","getLineDash":"Sv","getTransform":"P","isPointInPath":"po","isPointInStroke":"gu","measureText":"_w","putImageData":"dc","reset":"bt","roundRect":"vh","scale":"vi","setLineDash":"ef","setTransform":"ur","stroke":"uo","strokeText":"CR","transform":"fc","translate":"me","arcTo":"wa","beginPath":"lP","bezierCurveTo":"eS","clearRect":"nR","closePath":"ga","ellipse":"Pf","fillRect":"ig","lineTo":"ji","moveTo":"TC","quadraticCurveTo":"md","resetTransform":"te","restore":"nf","rotate":"S_","strokeRect":"Tc","addColorStop":"ah","location":"sy","ctrlKey":"ry","shiftKey":"pf","altKey":"tm","metaKey":"nP","repeat":"cn","isComposing":"jp","charCode":"pi","keyCode":"Pu","getModifierState":"Py","initKeyboardEvent":"jf","detail":"Rt","sourceCapabilities":"Ah","which":"_l","initUIEvent":"$C","target":"tg","currentTarget":"j","eventPhase":"wy","bubbles":"gf","cancelable":"Fw","defaultPrevented":"Ch","composed":"$","timeStamp":"Rs","srcElement":"op","returnValue":"ag","cancelBubble":"aC","composedPath":"oc","initEvent":"yl","preventDefault":"Sm","stopImmediatePropagation":"o","stopPropagation":"Ri","screenX":"Pm","screenY":"Am","clientX":"l_","clientY":"o_","button":"iy","buttons":"AR","relatedTarget":"nh","pageX":"Tm","pageY":"xm","offsetX":"bR","offsetY":"jR","movementX":"rv","movementY":"nv","fromElement":"yR","toElement":"or","layerX":"wv","layerY":"Pv","initMouseEvent":"ha","touches":"cc","targetTouches":"Aw","changedTouches":"ml","identifier":"Cd","radiusX":"_a","radiusY":"ta","rotationAngle":"Fi","force":"Ac","withCredentials":"g_","readyState":"Ss","onopen":"xt","onmessage":"n","onerror":"if","localDescription":"_p","currentLocalDescription":"as","pendingLocalDescription":"io","remoteDescription":"rw","currentRemoteDescription":"di","pendingRemoteDescription":"F_","signalingState":"nv","iceGatheringState":"Su","iceConnectionState":"mg","connectionState":"bS","canTrickleIceCandidates":"rv","onnegotiationneeded":"dh","onicecandidate":"_o","onsignalingstatechange":"wm","oniceconnectionstatechange":"cp","onconnectionstatechange":"Ar","onicegatheringstatechange":"gS","onicecandidateerror":"vP","ontrack":"PP","ondatachannel":"cs","onaddstream":"hy","onremovestream":"df","addIceCandidate":"in","addStream":"nC","addTrack":"xi","addTransceiver":"jy","createAnswer":"_S","createDTMFSender":"$S","createDataChannel":"mi","createOffer":"sl","getConfiguration":"ie","getLocalStreams":"uy","getReceivers":"Ft","getRemoteStreams":"ci","getSenders":"Fg","getStats":"m","getTransceivers":"ya","removeStream":"Al","removeTrack":"dP","restartIce":"jt","setConfiguration":"ow","setLocalDescription":"ve","setRemoteDescription":"ym","label":"$s","ordered":"lr","maxPacketLifeTime":"yP","maxRetransmits":"yR","protocol":"ho","negotiated":"$o","bufferedAmount":"pC","bufferedAmountLowThreshold":"Ch","onbufferedamountlow":"Pa","onclosing":"c_","onclose":"re","binaryType":"wg","reliable":"fr"};

    const Seed = 822478298;
    const Mod = 1019;

    const h2 = (str, seed = Seed, mod = Mod, _c) => {
        for (_c of str) {
            seed = (Math.imul(seed, 23131) + _c.charCodeAt(0)) >>> 0;
        }
        return seed % mod;
    }
    const l3 = (i,a)=>a[i%32]+(i<32?[]:a[i>>5]);

    let alphabet = String.fromCharCode(...BASE32);
    if(1) {
        let estimatedMap = new Map;
        const estimateUsage = (i) => {
            let idx = i % 32;
            estimatedMap.set(idx, 1 + (estimatedMap.get(idx) | 0));
            if (i >= 32) {
                idx = i >> 5;
                estimatedMap.set(idx, 1 + (estimatedMap.get(idx) | 0));
            }
        }

        for (let id in HASH_TABLE) {
            const hash = h2(id);
            src.replaceAll(reFieldID(id), (a, c1, c2, c3) => {
                estimateUsage(hash);
                return "";
            });
        }
        estimatedMap = new Map([...estimatedMap].sort((a, b)=> 32 * b[1] - 32 * a[1] + a[0] - b[0]));
        // console.info(estimatedMap);
        const indices = [];
        for(let i = 0; i < 32; ++i) {
            indices[i] = i;
        }
        indices.sort((a,b)=>
            32 * (estimatedMap.get(b) ?? 0) - 32 * (estimatedMap.get(a) ?? 0) +
            a - b
        );
        // console.info(indices);


        let tb = BASE32.concat();
        for(const i of indices) {
            SORTED_BASE32[i] = tb.shift();
        }
        // console.info("INITIAL BASE32: " + String.fromCharCode(...BASE32));
        alphabet = String.fromCharCode(...SORTED_BASE32);
        // console.info("SORTED  BASE32: " + alphabet);
    }

    const stats = new Map;
    for(let id in HASH_TABLE) {
        const hash = l3(h2(id), alphabet);
        src = src.replaceAll(reFieldID(id), (a, c1, c2, c3) => {
            const statName = id + " - " + hash;
            stats.set(statName, (stats.get(statName)|0) + 1);
            return c1 + hash + c3;
        });
    }

    src = src.replaceAll('("canvas")', '`canvas`');
    src = src.replaceAll('("2d")', '`2d`');
    src = src.replaceAll('(",")', '`,`');
    src = src.replaceAll('getItem("_")', 'getItem`_`');
    src = src.replaceAll('("pick your name")', '`pick your name`');
    src = src.replaceAll('("connection lost")', '`connection lost`');

    src = src.replace(`"################################"`, `"${alphabet}"`);

    if(0) {
        const sortedStats = [...stats].sort((a, b) => b[1] - a[1]);
        for (const s of sortedStats) {
            console.info(s[1] + " : " + s[0]);
        }
    }

    writeFileSync(dest, src, "utf8");
}