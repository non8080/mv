//=============================================================================
// IPN_CustomObject.js
// version: 1.0.0
// ----------------------------------------------------------------------------
// (C)2024 一般人
// This software is released under the MIT License.
// https://x.com/20MM21
//=============================================================================

/*:ja
 * @plugindesc カスタムオブジェクト管理プラグイン
 * @author by 一般人
 * 
 * @help 無制限に要素や値を追加・削除および、動的に変更可能なオリジナルのオブジェクトを作成できます。
 * セーブ＆ロード時にエラーを出さないために、オブジェクトは$gameVariablesではなく$gameSystemに保存されます。
 *
 *
 * ◆用途
 *
 *   ツクール標準のアイテムオブジェクトは、ID別に管理されているため、
 *   同IDのアイテムらにそれぞれ異なるパラメーターを設定することは不可能ですが、
 *   独自のオブジェクトを作成すれば、個別管理が可能です。
 *  
 *   ドラ●エのように、同名のアイテムを並べて表示できますし、独立した別個体として扱えるので
 *   たとえば、メタルマッ●スでいう戦車装備のような、動的パラメーターがあるオブジェクトも作成できます。
 *   また、改造や合成などを行う際にも重宝します。
 *   トリアコンタン様の「カスタムメニュー作成プラグイン（SceneCustomMenu.js）」と併用すれば
 *   お手軽に各メニューを作成できます。
 *
 *
 * ◆使用方法:
 * 
 * 1. カスタムオブジェクトの作成（myObject部分は任意の名称を指定）
 *    $gameSystem.createCustomObject('myObject');
 *
 * 2. 要素の追加（第一引数：オブジェクト名, 第二引数：要素名, 第三引数：値）
 *    $gameSystem.addElementToObject('myObject', 'name', 'A');
 *    $gameSystem.addElementToObject('myObject', 'value', 10);
 *
 * 3. 要素の確認
 *    $gameSystem.getElementFromObject('myObject', 'name');　// 'A'
 *    $gameSystem.getElementFromObject('myObject', 'value');　// 10
 *    
 * 4. 要素の値を変更
 *    $gameSystem.updateElementProperty('myObject', 'name', 'B');
 *
 * 5. 要素の削除
 *    $gameSystem.removeElementFromObject('myObject', 'value');
 *
 * 6. カスタムオブジェクトの削除
 *    $gameSystem.deleteCustomObject('myObject');
 *
 * 7. 指定したカスタムオブジェクトの中身を返す
 *    $gameSystem.getElementFromObject('myObject');　//{ name: 'A', value: 10 }
 *
 * 8. すべてのカスタムオブジェクトを返す
 *    $gameSystem.listCustomObjects();
 *
 * 9. 特定のカスタムオブジェクトを返す
 *    $gameSystem.ChoicelistCustomObjects("myObject1", "myObject3");
 *
 *
 * ◆注意事項:
 *   カスタムオブジェクト名は一意である必要があります。
 *   カスタムオブジェクトを削除すると、それに関連するすべての要素も削除されます。
 *
 * ◆利用規約：
 *   作者に無断で改変、再配布が可能で、利用形態（商用、18禁利用等）
 *   についても制限はありません。
 *
 * ◆免責事項：
 *   当プラグインを利用したことによるいかなる損害も
 *   制作者は一切、責任を負いません。
 *
 *
 */


(function() {
    // $gameSystem 内のカスタムオブジェクトコンテナを初期化
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._customObjects = {};
    };

    // 新しいカスタムオブジェクトを作成
    Game_System.prototype.createCustomObject = function(key) {
        if (!this._customObjects[key]) {
            this._customObjects[key] = {};
        }
    };

    // カスタムオブジェクト内の要素を追加
    Game_System.prototype.addElementToObject = function(key, name, value) {
        if (this._customObjects[key]) {
            this._customObjects[key][name] = value;
        } else {
            console.warn(`Custom object with key "${key}" does not exist.`);
        }
    };

    // カスタムオブジェクトから要素を取得
    Game_System.prototype.getElementFromObject = function(key, name) {
        if (this._customObjects[key]) {
            return this._customObjects[key][name];
        } else {
            console.warn(`Custom object with key "${key}" does not exist.`);
            return null;
        }
    };

    // カスタムオブジェクト内の要素の特定のプロパティを更新
    Game_System.prototype.updateElementProperty = function(key, name, newValue) {
        if (this._customObjects[key] && this._customObjects[key][name]) {
            this._customObjects[key][name] = newValue;
        } else {
            console.warn(`Property "${name}" in custom object with key "${key}" does not exist.`);
        }
    };

    // カスタムオブジェクトから要素を削除
    Game_System.prototype.removeElementFromObject = function(key, name) {
        if (this._customObjects[key] && this._customObjects[key][name]) {
            delete this._customObjects[key][name];
        } else {
            console.warn(`Property "${name}" in custom object with key "${key}" does not exist.`);
        }
    };

    // カスタムオブジェクトを削除
    Game_System.prototype.deleteCustomObject = function(key) {
        if (this._customObjects[key]) {
            delete this._customObjects[key];
        } else {
            console.warn(`Custom object with key "${key}" does not exist.`);
        }
    };

    // カスタムオブジェクトからすべての要素を取得
    Game_System.prototype.getAllElementsFromObject = function(key) {
        if (this._customObjects[key]) {
            return this._customObjects[key];
        } else {
            console.warn(`Custom object with key "${key}" does not exist.`);
            return null;
        }
    };

    // 全てのカスタムオブジェクトの一覧を取得
    Game_System.prototype.listCustomObjects = function() {
        let customObjectsList = {};
        Object.keys(this._customObjects).forEach(key => {
            let obj = {};
            Object.keys(this._customObjects[key]).forEach(innerKey => {
                obj[innerKey] = this._customObjects[key][innerKey];
            });
            customObjectsList[key] = obj;
        });
        return customObjectsList;
    };

    // 特定のカスタムオブジェクトの一覧を取得
    Game_System.prototype.ChoicelistCustomObjects = function(...groups) {
        let customObjectsList = {};
        groups.forEach(group => {
            if (this._customObjects[group]) {
                customObjectsList[group] = this._customObjects[group];
            }
        });
        return customObjectsList;
    };

})();
