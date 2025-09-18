/*:
 * @plugindesc Matter.jsで画面上にボールを落下させるデモ ( MV_MatterBalls.js )
 * @author 一般人
 *
 * @param LibraryPath
 * @text Matter.jsのパス
 * @desc プロジェクトルートからのパス  例: js/libs/matter.min.js
 * @default js/libs/matter.min.js
 *
 * @param GravityY
 * @text 重力Y
 * @type number
 * @decimals 2
 * @desc 下向き重力の強さ (デフォ: 1.0)  Matter.jsはピクセル基準でOK
 * @default 1.0
 *
 * @param BallRadius
 * @text 玉の半径(px)
 * @type number
 * @min 4
 * @default 14
 *
 * @param Restitution
 * @text 反発係数(バウンド)
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 0.65
 *
 * @param SpawnEverySec
 * @text 自動スポーン間隔(秒)
 * @type number
 * @decimals 2
 * @min 0
 * @desc 0で自動スポーン無し  0.5なら0.5秒ごとに1個スポーン
 * @default 0.75
 *
 * @param MaxBalls
 * @text 最大玉数
 * @type number
 * @min 1
 * @default 60
 *
 * @param ClickToSpawn
 * @text クリックでスポーン
 * @type boolean
 * @on 有効
 * @off 無効
 * @default true
 *
 * @help
 *
 * ■ 操作
 *  - クリック/タップでその位置に玉を追加（ClickToSpawn=trueのとき）。
 *
 * ■ 注意
 *  - マップシーンでのみ動作します。戦闘シーンでは動きません。
 *  - 他プラグインでScene_Map拡張が多い場合は読み込み順を調整してください。
 *
 * このプラグインはサンプルです。ご自由に改変OK。
 */
(function() {
  'use strict';

  var PLUGIN_NAME = document.currentScript ? document.currentScript.src.match(/([^\/]+)\.js$/)[1] : 'MV_MatterBalls';
  var params = PluginManager.parameters(PLUGIN_NAME);

  var LIB_PATH       = String(params['LibraryPath'] || 'js/libs/matter.min.js');
  var GRAVITY_Y      = Number(params['GravityY'] || 1.0);
  var RADIUS         = Math.max(4, Number(params['BallRadius'] || 14));
  var RESTITUTION    = Math.min(1, Math.max(0, Number(params['Restitution'] || 0.65)));
  var SPAWN_SEC      = Math.max(0, Number(params['SpawnEverySec'] || 0.75));
  var MAX_BALLS      = Math.max(1, Number(params['MaxBalls'] || 60));
  var CLICK_SPAWN    = String(params['ClickToSpawn'] || 'true') === 'true';

  // 簡易ローダ
  function loadScript(src, attrKey) {
    return new Promise(function(resolve, reject) {
      if (window.Matter) return resolve();
      if (document.querySelector('script[' + attrKey + ']')) return resolve();
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.setAttribute(attrKey, '1');
      s.onload = function(){ resolve(); };
      s.onerror = function(){ reject(new Error('Failed to load: ' + src)); };
      document.head.appendChild(s);
    });
  }

  // --- 色ユーティリティ（Pixi v4互換: 数値色を返す） ---
  function hslToRgbInt(h, s, l) {
    // h:0-360, s:0-100, l:0-100 → 0xRRGGBB（数値）
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2*l - 1)) * s;
    var x = c * (1 - Math.abs((h/60)%2 - 1));
    var m = l - c/2;
    var r=0,g=0,b=0;
    if (0<=h && h<60){r=c; g=x; b=0;}
    else if (60<=h && h<120){r=x; g=c; b=0;}
    else if (120<=h && h<180){r=0; g=c; b=x;}
    else if (180<=h && h<240){r=0; g=x; b=c;}
    else if (240<=h && h<300){r=x; g=0; b=c;}
    else {r=c; g=0; b=x;}
    var R = Math.round((r+m)*255);
    var G = Math.round((g+m)*255);
    var B = Math.round((b+m)*255);
    return (R << 16) | (G << 8) | B;
  }

  // 物理 + 見た目の管理
  var Bouncy = {
    ready: false,
    engine: null,
    world: null,
    pairs: [], // { body, gfx }
    walls: [],
    spawnElapsed: 0,

    async init() {
      await loadScript(LIB_PATH, 'data-matterjs-loaded');
      if (!window.Matter) throw new Error('Matter.js not found');

      this.engine = Matter.Engine.create();
      this.world  = this.engine.world;
      // 重力設定
      this.engine.world.gravity.y = GRAVITY_Y;

      this.ready = true;
    },

    // 画面外へ出ないよう境界(床/左右/天井)を作成
    buildBounds() {
      var W = Graphics.boxWidth;
      var H = Graphics.boxHeight;
      var t = 40; // 厚み
      var Bodies = Matter.Bodies;
      var World  = Matter.World;

      var floor = Bodies.rectangle(W * 0.5, H + t/2, W + 200, t, { isStatic:true });
      var ceil  = Bodies.rectangle(W * 0.5, -t/2,    W + 200, t, { isStatic:true });
      var left  = Bodies.rectangle(-t/2,    H * 0.5, t, H + 200, { isStatic:true });
      var right = Bodies.rectangle(W + t/2, H * 0.5, t, H + 200, { isStatic:true });

      this.walls = [floor, ceil, left, right];
      World.add(this.world, this.walls);
    },

    // 玉を作る（x,y: 省略で上からランダム）
    spawnBall(scene, x, y) {
      var W = Graphics.boxWidth;
      var r = RADIUS;
      var Bodies = Matter.Bodies;
      var World  = Matter.World;

      var sx = (typeof x === 'number') ? x : (Math.random() * (W - r*2) + r);
      var sy = (typeof y === 'number') ? y : (-r - 2);

      var body = Bodies.circle(sx, sy, r, {
        restitution: RESTITUTION,
        friction: 0.05,
        frictionAir: 0.002,
        density: 0.0015
      });

      World.add(this.world, body);

      // 見た目: PIXI.Graphics の円（Pixi v4互換: 数値色で指定）
      var g = new PIXI.Graphics();
      var hue = Math.floor(Math.random()*360);
      var fillColor = hslToRgbInt(hue, 70, 55);
      var strokeColor = hslToRgbInt(hue, 60, 35);
      g.beginFill(fillColor, 1.0);
      g.lineStyle(2, strokeColor, 0.9);
      g.drawCircle(0, 0, r);
      g.endFill();
      g.x = sx;
      g.y = sy;

      // マップの描画レイヤに追加（タイルの上）
      var container = (scene._spriteset && scene._spriteset._baseSprite) ?
                      scene._spriteset._baseSprite : scene;
      container.addChild(g);

      this.pairs.push({ body: body, gfx: g });

      // 多すぎる時は古い玉から削除
      if (this.pairs.length > MAX_BALLS) {
        var rm = this.pairs.shift();
        Matter.World.remove(this.world, rm.body);
        if (rm.gfx && rm.gfx.parent) rm.gfx.parent.removeChild(rm.gfx);
      }
    },

    step(dtSec) {
      if (!this.ready) return;
      var ms = Math.max(1, Math.floor((dtSec || 1/60) * 1000));
      Matter.Engine.update(this.engine, ms);
    },

    // Matter → PIXI 同期
    syncGraphics() {
      for (var i=0; i<this.pairs.length; i++) {
        var p = this.pairs[i];
        if (!p || !p.body || !p.gfx) continue;
        p.gfx.x = p.body.position.x;
        p.gfx.y = p.body.position.y;
        p.gfx.rotation = p.body.angle;
      }
    },

    // 自動スポーン
    tickAutoSpawn(scene, dtSec) {
      if (SPAWN_SEC <= 0) return;
      this.spawnElapsed += dtSec;
      while (this.spawnElapsed >= SPAWN_SEC) {
        this.spawnElapsed -= SPAWN_SEC;
        this.spawnBall(scene);
      }
    },

    // クリックでスポーン
    tickClickSpawn(scene) {
      if (!CLICK_SPAWN) return;
      if (TouchInput.isTriggered()) {
        this.spawnBall(scene, TouchInput.x, TouchInput.y);
      }
    },

    // リサイズ（念のため）
    refreshBounds() {
      if (!this.ready) return;
      for (var i=0; i<this.walls.length; i++) {
        Matter.World.remove(this.world, this.walls[i]);
      }
      this.walls.length = 0;
      this.buildBounds();
    },

    // 全破棄
    dispose(scene) {
      if (!this.ready) return;
      try {
        for (var i=0; i<this.pairs.length; i++) {
          var p = this.pairs[i];
          if (p && p.gfx && p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
        }
        this.pairs.length = 0;
        for (var j=0; j<this.walls.length; j++) {
          Matter.World.remove(this.world, this.walls[j]);
        }
        this.walls.length = 0;
        this.world = null;
        this.engine = null;
      } catch(e) {
        console.error('[MV_MatterBouncyBalls] dispose error:', e);
      }
      this.ready = false;
    }
  };

  // Scene_Map に結合
  var _Scene_Map_start = Scene_Map.prototype.start;
  Scene_Map.prototype.start = function() {
    _Scene_Map_start.call(this);
    if (!Bouncy.ready) {
      Bouncy.init()
        .then(() => {
          Bouncy.buildBounds();
          for (var i=0; i<5; i++) Bouncy.spawnBall(this);
        })
        .catch(e => console.error('[MV_MatterBouncyBalls] ' + e.message));
    } else {
      Bouncy.refreshBounds();
    }
  };

  var _Scene_Map_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    if (!Bouncy.ready) return;
    var dt = SceneManager._deltaTime || 1/60;
    Bouncy.step(dt);
    Bouncy.tickAutoSpawn(this, dt);
    Bouncy.tickClickSpawn(this);
    Bouncy.syncGraphics();
  };

  var _Scene_Map_terminate = Scene_Map.prototype.terminate;
  Scene_Map.prototype.terminate = function() {
    _Scene_Map_terminate.call(this);
    if (Bouncy.ready) {
      Bouncy.dispose(this);
    }
  };

  var _Graphics_onResize = Graphics._onResize;
  Graphics._onResize = function() {
    _Graphics_onResize.call(this);
    if (Bouncy.ready) Bouncy.refreshBounds();
  };

})();
