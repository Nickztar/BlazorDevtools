// How long the rect should be shown for?
const DISPLAY_DURATION = 250;

// What's the longest we are willing to show the overlay for?
// This can be important if we're getting a flurry of events (e.g. scroll update).
const MAX_DISPLAY_DURATION = 3000;

// How long should a rect be considered valid for?
const REMEASUREMENT_AFTER_DURATION = 250;

const OUTLINE_COLOR = "#f0f0f0";

// Note these colors are in sync with DevTools Profiler chart colors.
const COLORS = [
    "#37afa9",
    "#63b19e",
    "#80b393",
    "#97b488",
    "#abb67d",
    "#beb771",
    "#cfb965",
    "#dfba57",
    "#efbb49",
    "#febc38",
];

let canvas = null;
// Some environments (e.g. React Native / Hermes) don't support the performance API yet.
const getCurrentTime =
  typeof performance === 'object' && typeof performance.now === 'function'
    ? () => performance.now()
    : () => Date.now();

let drawAnimationFrameID = null;
let isEnabled = true;
let redrawTimeoutID = null;
let nodeToData = new Map();

//This just a slightly modified version of react devtools tracing method.
function traceUpdates(nodes) {
  if (!isEnabled) {
    return;
  }

  nodes.forEach(node => {
    const data = nodeToData.get(node);
    const now = getCurrentTime();

    let lastMeasuredAt = data != null ? data.lastMeasuredAt : 0;
    let rect = data != null ? data.rect : null;
    if (rect === null || lastMeasuredAt + REMEASUREMENT_AFTER_DURATION < now) {
      lastMeasuredAt = now;
      rect = measureNode(node);
    }

    nodeToData.set(node, {
      count: data != null ? data.count + 1 : 1,
      expirationTime:
        data != null
          ? Math.min(
              now + MAX_DISPLAY_DURATION,
              data.expirationTime + DISPLAY_DURATION,
            )
          : now + DISPLAY_DURATION,
      lastMeasuredAt,
      rect,
    });
  });

  if (redrawTimeoutID !== null) {
    clearTimeout(redrawTimeoutID);
    redrawTimeoutID = null;
  }

  if (drawAnimationFrameID === null) {
    drawAnimationFrameID = requestAnimationFrame(prepareToDraw);
  }
}

function prepareToDraw() {
  drawAnimationFrameID = null;
  redrawTimeoutID = null;

  const now = getCurrentTime();
  let earliestExpiration = Number.MAX_VALUE;

  // Remove any items that have already expired.
  nodeToData.forEach((data, node) => {
    if (data.expirationTime < now) {
      nodeToData.delete(node);
    } else {
      earliestExpiration = Math.min(earliestExpiration, data.expirationTime);
    }
  });

  draw(nodeToData);

  if (earliestExpiration !== Number.MAX_VALUE) {
    redrawTimeoutID = setTimeout(prepareToDraw, earliestExpiration - now);
  }
}

function measureNode(node) {
  if (!node || typeof node.getBoundingClientRect !== 'function') {
    return null;
  }

  return node.getBoundingClientRect();
}


function draw(nodeToData) {
    if (canvas === null) {
        initialize();
    }

    const canvasFlow = canvas;
    canvasFlow.width = window.innerWidth;
    canvasFlow.height = window.innerHeight;

    const context = canvasFlow.getContext("2d");
    context.clearRect(0, 0, canvasFlow.width, canvasFlow.height);

    nodeToData.forEach(({ count, rect }) => {
        if (rect !== null) {
            const colorIndex = Math.min(COLORS.length - 1, count - 1);
            const color = COLORS[colorIndex];

            drawBorder(context, rect, color);
        }
    });
}

function drawBorder(context, rect, color) {
    const { height, left, top, width } = rect;

    // outline
    context.lineWidth = 1;
    context.strokeStyle = OUTLINE_COLOR;

    context.strokeRect(left - 1, top - 1, width + 2, height + 2);

    // inset
    context.lineWidth = 1;
    context.strokeStyle = OUTLINE_COLOR;
    context.strokeRect(left + 1, top + 1, width - 1, height - 1);
    context.strokeStyle = color;

    context.setLineDash([0]);

    // border
    context.lineWidth = 1;
    context.strokeRect(left, top, width - 1, height - 1);

    context.setLineDash([0]);
}

function destroy() {
    if (canvas !== null) {
        if (canvas.parentNode != null) {
            canvas.parentNode.removeChild(canvas);
        }
        canvas = null;
    }
}

function initialize() {
    canvas = window.document.createElement("canvas");
    canvas.style.cssText = `
    xx-background-color: red;
    xx-opacity: 0.5;
    bottom: 0;
    left: 0;
    pointer-events: none;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 1000000000;
  `;

    const root = window.document.documentElement;
    root.insertBefore(canvas, root.firstChild);
}

//Intercept the render method used by blazor to find out which components are being rerendered.
(function () {
  const _renderBatch = Blazor._internal.renderBatch;
  Blazor._internal.renderBatch = (browserRendererId, memAdress) => {
      try {
          const batch = new SharedMemoryRenderBatch(memAdress);
          const arrayRangeReader = batch.arrayRangeReader;
          const updatedComponentsRange = batch.updatedComponents();
          const updatedComponentsValues = arrayRangeReader.values(updatedComponentsRange);
          const updatedComponentsLength = arrayRangeReader.count(updatedComponentsRange);
          const diffReader = batch.diffReader;
          const updatedComponents = new Set();
          for (let i = 0; i < updatedComponentsLength; i++) {
              const diff = batch.updatedComponentsEntry(updatedComponentsValues, i);
              const componentId = diffReader.componentId(diff);
              const targetComponent = Blazor._internal.browserRenderers[browserRendererId].childComponentLocations[componentId]?.parentNode;
              updatedComponents.add(targetComponent);
          }
          traceUpdates(updatedComponents);
          _renderBatch(browserRendererId, memAdress);
      } catch (e) {
          console.error(e)
      }
  }
})()

function arrayValuesEntry(arrayValues, index, itemSize) {
  return Blazor.platform.getArrayEntryPtr(arrayValues, index, itemSize);
}
//This is just a non minified version of the renderbatch used in the normal blazor renderer.
class SharedMemoryRenderBatch {
  constructor(batchAddress) {
      this.batchAddress = batchAddress;
  }

  updatedComponents() {
      return Blazor.platform.readStructField(this.batchAddress, 0);
  }

  referenceFrames() {
      return Blazor.platform.readStructField(this.batchAddress, this.arrayRangeReader.structLength);
  }

  updatedComponentsEntry(values, index) {
      return arrayValuesEntry(values, index, this.diffReader.structLength);
  }

  referenceFramesEntry(values, index) {
      return arrayValuesEntry(values, index, this.frameReader.structLength);
  }

  arrayRangeReader = {
    structLength: 8,
    values: (arrayRange) => Blazor.platform.readObjectField(arrayRange, 0),
    count: (arrayRange) => Blazor.platform.readInt32Field(arrayRange, 4)
  };

  arrayBuilderSegmentReader = {
    structLength: 12,
    values: (arrayBuilderSegment) => {
        const builder = Blazor.platform.readObjectField(arrayBuilderSegment, 0);
        const builderFieldsAddress = Blazor.platform.getObjectFieldsBaseAddress(builder);
        return Blazor.platform.readObjectField(builderFieldsAddress, 0);
    },
    offset: (arrayBuilderSegment) => Blazor.platform.readInt32Field(arrayBuilderSegment, 4),
    count: (arrayBuilderSegment) => Blazor.platform.readInt32Field(arrayBuilderSegment, 8),
  };

  diffReader = {
    structLength: 4 + this.arrayBuilderSegmentReader.structLength,
    componentId: (diff) => Blazor.platform.readInt32Field(diff, 0),
    edits: (diff) => Blazor.platform.readStructField(diff, 4),
    editsEntry: (values, index) => arrayValuesEntry(values, index, this.editReader.structLength),
  };

  editReader = {
    structLength: 20,
    editType: (edit) => Blazor.platform.readInt32Field(edit, 0),
    siblingIndex: (edit) => Blazor.platform.readInt32Field(edit, 4),
    newTreeIndex: (edit) => Blazor.platform.readInt32Field(edit, 8),
    moveToSiblingIndex: (edit) => Blazor.platform.readInt32Field(edit, 8),
    removedAttributeName: (edit) => Blazor.platform.readStringField(edit, 16),
  };

  frameReader = {
    structLength: 36,
    frameType: (frame) => Blazor.platform.readInt16Field(frame, 4),
    subtreeLength: (frame) => Blazor.platform.readInt32Field(frame, 8),
    elementReferenceCaptureId: (frame) => Blazor.platform.readStringField(frame, 16),
    componentId: (frame) => Blazor.platform.readInt32Field(frame, 12),
    elementName: (frame) => Blazor.platform.readStringField(frame, 16),
    textContent: (frame) => Blazor.platform.readStringField(frame, 16),
    markupContent: (frame) => Blazor.platform.readStringField(frame, 16),
    attributeName: (frame) => Blazor.platform.readStringField(frame, 16),
    attributeValue: (frame) => Blazor.platform.readStringField(frame, 24, true),
    attributeEventHandlerId: (frame) => Blazor.platform.readUint64Field(frame, 8),
  }
}