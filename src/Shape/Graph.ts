import Node from "./Node";
import Line from "./Line";
import AnchorLine from "./AnchorLine";
import VEditor from "../VEditor";
import { setAttrs, svgWrapper } from "../Utils/dom";
import { VEditorSchema } from "../Model/Schema";
import * as Utils from "../Utils";
const backSvg = require("../back.svg").default;

class Graph extends Utils.Event {
  editor: VEditor;
  node: Node;
  line: Line;
  anchorLine: AnchorLine;
  linkStatus: string;
  data: VEditorSchema;
  shadow: SVGSVGElement;

  constructor(editor: VEditor) {
    super();
    this.editor = editor;
    this.node = new Node(this);
    this.line = new Line(this);
    this.anchorLine = new AnchorLine(this);
    this.initDefs();

    this.listenEvents();
    if (this.editor.config.showBackGrid) {
      this.addBack();
    }
  }

  addBack() {
    (
      this.editor.container.querySelector(
        ".ve-editor-back"
      ) as HTMLDivElement
    ).style.backgroundImage = `url(${backSvg})`;
  }

  listenEvents() {

    this.on("node:move", ({ node }) => {
      this.line.updateByNode(node);
    });
    setAttrs(this.editor.svg, {
      tabindex: "0",
    });
    this.editor.svg.addEventListener("click", (e: MouseEvent) => {
      if ((e.target as Element).tagName === "svg") {
        this.fire("paper:click", e);
      }
    });

    document.addEventListener("keydown", this.onKeyDown);

    this.on("line:drag", () => {
      this.linkStatus = "lineing";
      this.editor.paper.classList.add("ve-paper-lineing");
    });
    this.on("line:drop", () => {
      this.linkStatus = "none";
      this.editor.paper.classList.remove("ve-paper-lineing");
    });
  }

  onKeyDown = (e: KeyboardEvent) => {

    // 查看模式不能删除节点、线条；如果存在部分可操作则自己在业务中监听处理相关逻辑
    if (this.editor.config.mode === "view") {
      return
    }
    if (
      ["TEXTAREA", "INPUT"].indexOf(document.activeElement.tagName) >
      -1 &&
      document.activeElement.getAttribute("contenteditable") !== "false"
    ) {
      return;
    }
    if (e.key === "Backspace") {
      const deleteKeys = [];
      for (let key in this.node.actives) {
        // 不触发事件
        this.node.deleteNode(this.node.actives[key].data);
        delete this.node.actives[key];
        deleteKeys.push(key);
      }
      this.line.activeLine &&
        this.line.deleteLine(this.line.activeLine.data);
      /**
       * @event Graph#delete
       * @type {Object}
       */
      this.fire("delete", { event: e, deleteKeys });
    }
    if (e.keyCode === "C".charCodeAt(0) && (e.metaKey || e.ctrlKey)) {
      /**
       * @event Graph#copy
       * @type {Object}
      */
      if (!this.editor.config.disableCopy) {
        this.fire("copy", { event: e });
      }
      return;
    }
    if (e.keyCode === "V".charCodeAt(0) && (e.metaKey || e.ctrlKey)) {
      /**
       * @event Graph#paste
       * @type {Object}
      */
      if (!this.editor.config.disableCopy) {
        this.fire("paste", { event: e });
      }
      return;
    }
    if (
      e.keyCode === "Z".charCodeAt(0) &&
      (e.metaKey || e.ctrlKey) &&
      !e.shiftKey
    ) {
      this.editor.schema.undo();
    }
    if (
      e.keyCode === "Z".charCodeAt(0) &&
      (e.metaKey || e.ctrlKey) &&
      e.shiftKey
    ) {
      this.editor.schema.redo();
    }
    e.preventDefault();
    return false;
  };

  async render(data: VEditorSchema) {
    /**
     * @event Graph#beforeRender 渲染之前触发
     */
    this.fire("beforeRender");
    this.data = data;
    await this.node.render(data.nodesMap);

    await this.line.render(data.linesMap);
    /**
     * @event Graph#render  渲染后触发
     */
    this.fire("render");
  }

  update() {
    this.node.update();
    this.line.update();
    /**
    * @event Graph#update  渲染后触发
    */
    this.fire("update");
  }



  initDefs() {
    if (document.getElementById("ve-svg-defs")) {
      this.shadow = document.getElementById("ve-svg-defs") as unknown as SVGSVGElement;
      return;
    };
    this.shadow = svgWrapper(
      `<svg id="ve-svg-defs" style="position:absolute;left:-9999px;top:-9999px;" xmlns="http://www.w3.org/2000/svg">
      <defs>
			<filter id="ve-black-shadow" >
                <feGaussianBlur in="SourceAlpha" stdDeviation="4"></feGaussianBlur>
                <feGaussianBlur stdDeviation="3" />
                <feOffset dx="0" dy="0" result="offsetblur"></feOffset>
                <feFlood flood-color="#333333"></feFlood>
                <feComposite in2="offsetblur" operator="in"></feComposite>
                <feComponentTransfer>
                    <feFuncA type="linear" slope="0.3"></feFuncA>
                </feComponentTransfer>
                <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
		</defs>
    </svg>`,
    ) as SVGSVGElement;
    document.body.appendChild(this.shadow);
  }

  /**
   * 清空画布
   */
  clearGraph() {
    this.line.clear();
    this.node.clear();
  }

  destroy() {
    this.clearGraph();
    this.clear();
    this.shadow.remove();
    this.shadow = undefined;
    document.removeEventListener("keydown", this.onKeyDown);
  }
}
export default Graph;
