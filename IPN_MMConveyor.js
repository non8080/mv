/*:
 * @plugindesc リージョンで動くベルトコンベア
 * @author 一般人
 *
 * @target MV
 * @url
 *
 * @param RegionUp
 * @text 上方向リージョンID
 * @type number
 * @min 0
 * @desc このリージョンを踏んでいるとコンベア「上方向」として扱います。0で無効。
 * @default 41
 *
 * @param RegionDown
 * @text 下方向リージョンID
 * @type number
 * @min 0
 * @desc コンベア「下方向」リージョン。0で無効。
 * @default 42
 *
 * @param RegionLeft
 * @text 左方向リージョンID
 * @type number
 * @min 0
 * @desc コンベア「左方向」リージョン。0で無効。
 * @default 43
 *
 * @param RegionRight
 * @text 右方向リージョンID
 * @type number
 * @min 0
 * @desc コンベア「右方向」リージョン。0で無効。
 * @default 44
 *
 * @param SpeedForwardMult
 * @text 前進倍率
 * @type number
 * @decimals 2
 * @desc コンベア進行方向に入力したときの速度倍率。
 * @default 1.25
 *
 * @param SpeedBackwardMult
 * @text 逆走倍率
 * @type number
 * @decimals 2
 * @desc コンベア進行方向と逆向きに入力したときの速度倍率。
 * @default 0.75
 *
 * @param SpeedNeutralMult
 * @text 中立倍率
 * @type number
 * @decimals 2
 * @desc 横方向へ移動するとき、または無入力時（AutoCarry=無効）の速度倍率。
 * @default 1.0
 *
 * @param AutoCarry
 * @text 自動搬送
 * @type boolean
 * @on 有効
 * @off 無効
 * @desc 無入力でもコンベア方向へ自動で移動させるか。（クラシック搬送）
 * @default true
 *
 * @param AllowLateralExit
 * @text 横方向離脱許可
 * @type boolean
 * @on 許可
 * @off 不可
 * @desc コンベア方向と直交する方向入力でベルトから離脱できるようにする。
 * @default true
 *
 * @param ResetOnExit
 * @text 離脱時速度リセット
 * @type boolean
 * @on リセットする
 * @off リセットしない
 * @desc コンベア外に出た瞬間、元の移動速度に戻します。
 * @default true
 *
 * @param AffectFollowers
 * @text フォロワーにも適用
 * @type boolean
 * @on 適用
 * @off 適用しない
 * @desc 隊列歩行のフォロワーにも速度補正をかける（見た目ズレ軽減）。
 * @default true
 *
 * @param ParalysisStateId
 * @text マヒで停止するステートID
 * @type number @min 1
 * @default 11
 *
 * @param DisableDashOnConveyor
 * @text コンベア中はダッシュ禁止
 * @type boolean @on 禁止 @off 許可
 * @default false
 *
 * @help
 * ============================================================================
 * ■概要
 * ============================================================================
 * マップ上のリージョンIDで「ベルトコンベア」タイルを指定し、
 * プレイヤー（および任意でフォロワー）の移動速度を入力方向に応じて
 * 自動で補正します。
 *
 * ・コンベア方向に入力 → 前進倍率（例：1.25倍）
 * ・逆向きに入力       → 逆走倍率（例：0.75倍）
 * ・横方向/無入力      → 中立倍率（例：1倍）
 * ・AutoCarry=有効     → 無入力でも自動でコンベア方向に移動
 * ・横入力離脱ON       → コンベアから途中で降りられる
 * ・離脱時リセットON   → ベルト外に出た瞬間、元の移動速度に戻る
 *
 * ============================================================================
 * ■導入手順
 * ============================================================================
 * 1. このファイルを js/plugins に入れ、プラグインマネージャで有効化。
 * 2. 各方向のリージョンIDを設定。
 * 3. マップエディタでコンベア床にリージョンペイント。
 * 4. 必要に応じて倍率・各種オプションを調整。
 *
 * ============================================================================
 * ■仕様詳細
 * ============================================================================
 * ●リージョン指定
 *   RegionUp=1 とした場合、リージョン1に塗ったタイルは「上向きコンベア」扱い。
 *   プレイヤーがそのタイル上にいる間だけ速度補正がかかります。
 *   0を指定した方向は無効（その方向のコンベアなし）。
 *
 * ●速度補正の考え方
 *   ツクールMVの内部移動速度 this._moveSpeed は段階（1～6）で管理され、
 *   実際の移動ピクセル速度は指数的に変化します。
 *   本プラグインでは「元の段階値 × 倍率」を計算し、1～8にクランプして設定します。
 *   ※ベース段階は「コンベアに乗る直前」の値を記憶します。
 *
 * ●フォロワー適用
 *   ON の場合、見た目のズレを減らす目的でフォロワーにも倍率をかけます。
 *   ただしフォロワー移動はエンジンの追従ロジックに依存するため、
 *   完全に同調する保証はありません（ラグ軽減程度）。
 *
 * ●自動搬送
 *   ONにすると、入力がなくてもコンベア方向へ moveStraight() を試みます。
 *   壁やイベントで詰まる場合があるので、通行設計に注意。
 *
 *
 * 【スクリプト】
 * 
 * ◆マップ全体 ON/OFF
 * $gameSystem.setConveyorEnabled(48,false);
 * 
 * ◆リージョン ON/OFF
 * $gameSystem.setConveyorRegionEnabled(null,41,false);
 * 
 * ◆左右反転
 * $gameSystem.toggleConveyorFlipH();
 * 
 * ◆上下反転
 * $gameSystem.toggleConveyorFlipV();
 * 
 * ◆向き変更（上方向を左方向に）
 * $gameSystem.setConveyorRegionDir(null,41,4);   //2：下　4：左　6：右　8：上
 * 
 * ◆向き変更解除（本来のリージョン方向に戻す）
 * $gameSystem.clearConveyorRegionDir(null,41);
 * 
 * 
 * 【プラグインコマンド】
 * 
 * ◆マップ全体 ON/OFF
 * ConveyorDisable 48
 * 
 * ◆リージョン ON/OFF
 * ConveyorDisableRegion 41
 * 
 * ◆左右反転
 * ConveyorFlipH
 * 
 * ◆上下反転
 * ConveyorFlipV
 * 
 * ◆向き変更
 * ConveyorSetDir 41 down   //down：下　left：左　right：右　up：上
 * 
 * ◆向き解除
 * ConveyorClearDir 41
 * 
 * 
 * ============================================================================
 * ■競合注意
 * ============================================================================
 * 他の移動速度制御系プラグイン（ダッシュ拡張 / 移動式カメラ / ステップ制御 等）
 * と併用する場合は、基本的に **このプラグインを下（後）に配置**してください。
 * それでも問題が出る場合は連絡ください。
 *
 * ============================================================================
 * ■更新履歴
 * ============================================================================
 * v1.0.0 - 初版公開
 *
 * ============================================================================
 * ■利用規約
 * ============================================================================
 * ・商用可 / 加工可 / 再配布可 / 無保証
 * 
 * ============================================================================
 * ■ ライセンス
 * ============================================================================
 * ・MIT License
 *   https://opensource.org/licenses/mit-license.php
 * 
 * ============================================================================
 */

(function(){
  'use strict';
  var PLUGIN_NAME = document.currentScript ? document.currentScript.src.match(/([^\/]+)\.js$/)[1] : 'IPN_MMConveyor';
  var prm = PluginManager.parameters(PLUGIN_NAME);

  var REG_UP    = Number(prm.RegionUp   || 41);
  var REG_DOWN  = Number(prm.RegionDown || 42);
  var REG_LEFT  = Number(prm.RegionLeft || 43);
  var REG_RIGHT = Number(prm.RegionRight|| 44);

  var FWD  = Number(prm.SpeedForwardMult  || 1.25);
  var BACK = Number(prm.SpeedBackwardMult || 0.75);
  var NEU  = Number(prm.SpeedNeutralMult  || 1);

  var AUTO   = prm.AutoCarry        === "true";
  var LATEX  = prm.AllowLateralExit === "true";
  var RESET  = prm.ResetOnExit      === "true";
  var FOLLOW = prm.AffectFollowers  === "true";
  var PARAID = Number(prm.ParalysisStateId||11);
  var NO_DASH= prm.DisableDashOnConveyor === "true";

  /* ==== util =========================================================== */
  function beltDir(x,y){
    var id=$gameMap.regionId(x,y);
    if(id===REG_UP) return 8;
    if(id===REG_DOWN) return 2;
    if(id===REG_LEFT) return 4;
    if(id===REG_RIGHT) return 6;
    return 0;
  }
  function opp(d){return {2:8,8:2,4:6,6:4}[d]||0;}
  function perp(a,b){if(!a||!b)return false;
    var v1=(a===2||a===8),v2=(b===2||b===8); return v1!==v2;}

  /* ==== CharacterBase 共通 ============================================ */
  Game_CharacterBase.prototype._convBase=null;
  Game_CharacterBase.prototype._convMul =1;
  Game_CharacterBase.prototype._convGlide=false;

  Game_CharacterBase.prototype.convStore=function(){
    if(this._convBase===null)this._convBase=this._moveSpeed;
  };
  Game_CharacterBase.prototype.convRestore=function(){
    if(this._convBase!==null)this.setMoveSpeed(this._convBase);
    this._convBase=null;
  };
  Game_CharacterBase.prototype.convApply=function(m){
    var b=(this._convBase!==null)?this._convBase:this._moveSpeed;
    this.setMoveSpeed(Math.max(1,Math.min(8,b*m)));
  };

  /* ==== Player ========================================================= */
  var _Pup=Game_Player.prototype.update;
  Game_Player.prototype.update=function(a){_Pup.call(this,a);this.convPlayer();}

  Game_Player.prototype.convPlayer=function(){
    var bd=beltDir(this.x,this.y),ip=Input.dir4;
    if(!bd){ if(RESET)this.convRestore(); this._convGlide=false; this._convMul=1; return;}

    this.convStore();
    var m=NEU;
    if(ip===0){ if(AUTO)this.autoCarry(bd); }
    else if(ip===bd) m=FWD;
    else if(ip===opp(bd)) m=BACK;
    else if(LATEX&&perp(ip,bd)) m=NEU;

    if(Math.abs(m-this._convMul)>0.001){ this.convApply(m); this._convMul=m; }
    this._convGlide = AUTO && ip===0;
  };

  /* ダッシュ禁止 & 実速度統一 ----------------------------------------- */
  if(NO_DASH){
    var _origIsDash = Game_Player.prototype.isDashing;
    Game_Player.prototype.isDashing = function(){
      if(beltDir(this.x,this.y)) return false; // コンベア上 → 常にダッシュ不可
      return _origIsDash.call(this);
    };
  }

  Game_Player.prototype.autoCarry=function(dir){
    if(this.isMoving())return;
    if(this.canPass(this.x,this.y,dir)) this.moveStraight(dir);
  };

  /* ==== Follower ======================================================= */
  if(FOLLOW){
    var _Fup=Game_Follower.prototype.update;
    Game_Follower.prototype.update=function(){_Fup.call(this);this.convFollower();}
    Game_Follower.prototype.convFollower=function(){
      if(!this.isVisible()){ if(RESET)this.convRestore(); this._convGlide=false; return;}
      var bd=beltDir(this.x,this.y);
      if(!bd){ if(RESET)this.convRestore(); this._convGlide=false; return;}

      this.convStore();
      /* プレイヤーの realMoveSpeed と同じ段階に近付ける */
      var real=$gamePlayer.realMoveSpeed();
      var mv  = Math.max(1,Math.min(8,real));  // clamp 1-8
      this.setMoveSpeed(mv);
      this._convGlide = AUTO && Input.dir4===0;
    };
  }

  /* ==== Sprite で最終アニメ確定 ======================================= */
  var _Sup=Sprite_Character.prototype.update;
  Sprite_Character.prototype.update=function(){_Sup.call(this);fixWalk(this);};

  function fixWalk(sp){
    var c=sp._character; if(!c)return;

    /* マヒ判定 */
    var par=false;
    if(c instanceof Game_Player){
      var lead=$gameParty.leader();
      par=lead&&lead.isStateAffected(PARAID);
    }else if(c instanceof Game_Follower){
      var a=$gameParty.aliveBattleMembers()[c._memberIndex]||null;
      par=!a||a.isStateAffected(PARAID);
    }

    var walk = !(par||c._convGlide);
    c.setWalkAnime(walk);  // 毎フレーム最終上書き
  }


  /* -----------------------------------------------------------------
   * Game_System 拡張
   * ----------------------------------------------------------------*/
  const _GS_init = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function(){
    _GS_init.call(this);

    /* ① ON/OFF・反転 */
    this._convEnabledMap    = {};   // mapId → bool
    this._convEnabledRegion = {};   // mapId → { regionId : bool }
    this._convFlipH = false;
    this._convFlipV = false;

    /* ② 向きオーバーライド */
    this._convRegionDirOverride = {}; // mapId → { regionId : dir(2/4/6/8) }
  };

  /* --- マップ単位 ON/OFF ----------------------------------------- */
  Game_System.prototype.isConveyorEnabled = function(mapId){
    mapId = mapId || $gameMap.mapId();
    return this._convEnabledMap.hasOwnProperty(mapId)
      ? this._convEnabledMap[mapId] : true;
  };
  Game_System.prototype.setConveyorEnabled = function(mapId, flag){
    this._convEnabledMap[mapId || $gameMap.mapId()] = !!flag;
  };
  Game_System.prototype.toggleConveyorEnabled = function(mapId){
    mapId = mapId || $gameMap.mapId();
    this.setConveyorEnabled(mapId, !this.isConveyorEnabled(mapId));
  };

  /* --- リージョン単位 ON/OFF ------------------------------------- */
  Game_System.prototype.isConveyorRegionEnabled = function(mapId, regionId){
    mapId = mapId || $gameMap.mapId();
    const table = this._convEnabledRegion[mapId];
    if(!table) return true;
    return table.hasOwnProperty(regionId) ? table[regionId] : true;
  };
  Game_System.prototype.setConveyorRegionEnabled = function(mapId, regionId, flag){
    mapId = mapId || $gameMap.mapId();
    this._convEnabledRegion[mapId] = this._convEnabledRegion[mapId] || {};
    this._convEnabledRegion[mapId][regionId] = !!flag;
  };
  Game_System.prototype.toggleConveyorRegionEnabled = function(mapId, regionId){
    const cur = this.isConveyorRegionEnabled(mapId, regionId);
    this.setConveyorRegionEnabled(mapId, regionId, !cur);
  };

  /* --- 反転 ------------------------------------------------------- */
  Game_System.prototype.setConveyorFlipH = function(flag){ this._convFlipH = !!flag; };
  Game_System.prototype.setConveyorFlipV = function(flag){ this._convFlipV = !!flag; };
  Game_System.prototype.toggleConveyorFlipH = function(){ this._convFlipH = !this._convFlipH; };
  Game_System.prototype.toggleConveyorFlipV = function(){ this._convFlipV = !this._convFlipV; };

  /* --- 向きオーバーライド --------------------------------------- */
  Game_System.prototype.setConveyorRegionDir = function(mapId, regionId, dir){
    mapId    = mapId    || $gameMap.mapId();
    regionId = Number(regionId);
    dir      = normalizeDir(dir);
    if(!dir) return;
    this._convRegionDirOverride[mapId] = this._convRegionDirOverride[mapId] || {};
    this._convRegionDirOverride[mapId][regionId] = dir;
  };
  Game_System.prototype.clearConveyorRegionDir = function(mapId, regionId){
    mapId    = mapId    || $gameMap.mapId();
    regionId = Number(regionId);
    const tbl = this._convRegionDirOverride[mapId];
    if(tbl) delete tbl[regionId];
  };
  Game_System.prototype.getConveyorRegionDir = function(mapId, regionId){
    mapId = mapId || $gameMap.mapId();
    const tbl = this._convRegionDirOverride[mapId];
    return tbl ? tbl[regionId] || 0 : 0;
  };

  function normalizeDir(d){
    if(typeof d === 'string'){
      d = d.toLowerCase();
      if(d==='up'||d==='u')    return 8;
      if(d==='down'||d==='d')  return 2;
      if(d==='left'||d==='l')  return 4;
      if(d==='right'||d==='r') return 6;
    }
    d = Number(d)||0;
    return (d===2||d===4||d===6||d===8) ? d : 0;
  }

  /* -----------------------------------------------------------------
   * pluginCommand 拡張（MV 用）
   * ----------------------------------------------------------------*/
  const _GI_pc = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(cmd, args){
    _GI_pc.call(this, cmd, args);

    /* 数値変換は必要な所だけで OK */
    const mapId    = Number(args[0] || $gameMap.mapId());
    const regionId = args.length > 1 ? Number(args[1]) : NaN;
    const dirArg   = args[2];

    switch(cmd){
      /*--- マップ全体 ------------------------------------------------*/
      case 'ConveyorEnable':   $gameSystem.setConveyorEnabled(mapId, true);                break;
      case 'ConveyorDisable':  $gameSystem.setConveyorEnabled(mapId, false);               break;
      case 'ConveyorToggle':   $gameSystem.toggleConveyorEnabled(mapId);                   break;

      /*--- リージョン単位 ON/OFF ------------------------------------*/
      case 'ConveyorEnableRegion':
        if(!isNaN(regionId)) $gameSystem.setConveyorRegionEnabled(mapId, regionId, true);
        break;
      case 'ConveyorDisableRegion':
        if(!isNaN(regionId)) $gameSystem.setConveyorRegionEnabled(mapId, regionId, false);
        break;
      case 'ConveyorToggleRegion':
        if(!isNaN(regionId)) $gameSystem.toggleConveyorRegionEnabled(mapId, regionId);
        break;

      /*--- 反転 ------------------------------------------------------*/
      case 'ConveyorFlipH':    $gameSystem.toggleConveyorFlipH();                          break;
      case 'ConveyorFlipV':    $gameSystem.toggleConveyorFlipV();                          break;

      /*--- 向きオーバーライド ---------------------------------------*/
      case 'ConveyorSetDir':
        if(!isNaN(regionId) && dirArg){
          $gameSystem.setConveyorRegionDir(mapId, regionId, dirArg);
        }
        break;
      case 'ConveyorClearDir':
        if(!isNaN(regionId)){
          $gameSystem.clearConveyorRegionDir(mapId, regionId);
        }
        break;
    }
  };

  /* -----------------------------------------------------------------
   * beltDir 拡張
   * ----------------------------------------------------------------*/
  const _baseBeltDir = beltDir;      // 元の関数を退避
  beltDir = function(x, y){
    const mapId    = $gameMap.mapId();
    const regionId = $gameMap.regionId(x, y);

    /* 0) マップ単位で無効なら即 0 */
    if(!$gameSystem.isConveyorEnabled(mapId)) return 0;

    /* 1) 向きオーバーライドがあればそれを最優先 */
    const over = $gameSystem.getConveyorRegionDir(mapId, regionId);
    if(over) return over;

    /* 2) リージョン無効判定 */
    if(!regionId) return 0;
    if(!$gameSystem.isConveyorRegionEnabled(mapId, regionId)) return 0;

    /* 3) 反転を考慮しつつ通常判定 */
    if(regionId === REG_UP)    return $gameSystem._convFlipV ? 2 : 8;
    if(regionId === REG_DOWN)  return $gameSystem._convFlipV ? 8 : 2;
    if(regionId === REG_LEFT)  return $gameSystem._convFlipH ? 6 : 4;
    if(regionId === REG_RIGHT) return $gameSystem._convFlipH ? 4 : 6;

    /* 4) 上記以外は元の beltDir があれば呼ぶ（保険） */
    return _baseBeltDir ? _baseBeltDir(x, y) : 0;
  };

})();
