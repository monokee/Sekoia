Cue.Plugin('cue-ui-sortable', function(lib, options = {lockAxis: true, animationTime: 0.3}) {

  /** ------------ Plugin Dependencies ------------ */
  const TweenLight = lib.core.TweenLight;
  const Draggable = lib.ui.Draggable;
  if (!TweenLight || !Draggable) {
    throw new ReferenceError(`Cue UI Sortable Plugin depends on GSAP TweenMax and Draggable...`);
  }

  /** ------------ Plugin Setup ------------ */
  const PLUGIN = this;
  const Expando = Symbol(PLUGIN.name);
  const classify = (string, fallback) => string ? string.split('.').join('') : fallback;

  class Sortable {

    constructor({container, containerSortingClass, itemClass, itemSortingClass, axis, lockAxis = options.lockAxis, animationTime = options.animationTime}) {

      this.container = container instanceof Element ? container : document.querySelector(container);
      this.containerSortingClass = classify(containerSortingClass, 'sorting');

      this.itemClass = classify(itemClass, void 0);
      this.itemSortingClass = classify(itemSortingClass, 'sorting');

      this.axis = axis ? axis.toLowerCase() : this.container.clientWidth > this.container.clientHeight ? 'x' : 'y';
      this.lockAxis = lockAxis;

      this.animationTime = animationTime;

      this.active = false;

    }

    activate() {

      if (this.active) return;

      // Initialize *Live* NodeList of sortable Elements in the container
      if (this.itemClass) this.sortables = this.container.getElementsByClassName(this.itemClass);
      else this.sortables = this.container.childNodes;

      // Cache initial Container Styles and Scroll Position
      this.cacheContainerProps();

      // Create Sortables and set their initial positions
      let i = -1, sortable = null, k = -1;
      while (++i < this.sortables.length) this.validateSortable(this.createSortable(this.sortables[i], i));
      while (++k < this.sortables.length) this.setPosition(this.sortables[k], k, false);

      // Set Temporary Container Styles, scroll positions and listeners.
      this.setContainerProps();

      this.active = true;

    }

    deactivate() {

      if (!this.active) return;

      clearTimeout(this.endTimer);

      this.endTimer = null;

      for (let i = 0; i < this.sortables.length; i++) {
        this.destroySortable(this.sortables[i]);
      }

      this.sortables = null;

      // Reset container and clear it's cached props
      this.unsetContainerProps();
      this.clearContainerCache();

      this.active = false;

    }

    createSortable(item, index) {

      const model = item[Expando] = {};

      model.index = index;

      model.originalStyles = item.getAttribute('style') || '';
      item.style.position = 'absolute';

      const si = getComputedStyle(item);
      model.size = {
        x: item.clientWidth + parseInt(si.marginLeft) + parseInt(si.marginRight) + parseInt(si.borderLeft) + parseInt(si.borderRight),
        y: item.clientHeight + parseInt(si.marginTop) + parseInt(si.marginBottom) + parseInt(si.borderTop) + parseInt(si.borderBottom)
      };

      let lastItemIndex = 0, i = 0, v = 0, top = 0;

      model.draggable = new Draggable(item, {
        type: this.lockAxis ? this.axis : 'x,y',
        cursor: 'inherit',
        autoScroll: 1,
        dragClickables: true,
        allowNativeTouchScrolling: false,
        onPress: e => {
          e.preventDefault(); // Stops horizontal scrolling while dragging horizontally
          item.classList.add(this.itemSortingClass);
          lastItemIndex = this.sortables.length - 1;
        },
        onDrag: e => {
          i = (v = Math.round(model.draggable[this.axis] / this.cellSize)) < 0 ? 0 : (v > lastItemIndex ? lastItemIndex : v);
          if (i !== model.index) {
            this.moveItem(item, i);
            this.sortItems();
          }
        },
        onRelease: () => {
          this.setPosition(item, model.index, true);
          item.classList.remove(this.itemSortingClass);
        }
      });

      return model;

    }

    destroySortable(item) {
      item[Expando].draggable.kill();
      item.setAttribute('style', item[Expando].originalStyles);
      delete item[Expando];
    }

    moveItem(item, to) {
      if (to === this.sortables.length - 1) {
        this.container.appendChild(item);
      } else {
        this.container.insertBefore(item, this.sortables[item[Expando].index > to ? to : to + 1]);
      }
    }

    sortItems() {
      for (let i = 0, item = null, model = null, currentIndex = 0; i < this.sortables.length; i++) {
        if ((currentIndex = (model = (item = this.sortables[i])[Expando]).index) === i) continue;
        model.index = i;
        if (!model.draggable.isDragging) this.setPosition(item, i, true);
      }
    }

    setPosition(item, index, tween = true) {
      if (tween) {
        TweenLite.to(item, this.animationTime, {
          [this.axis]: index * this.cellSize
        });
      } else {
        TweenLite.set(item, {
          [this.axis]: index * this.cellSize
        });
      }
    }

    validateSortable(model) {
      // Check that CellSize is equal on Axis for all Sortables in the set
      this.cellSize = this.cellSize || model.size[this.axis];
      if (this.cellSize !== model.size[this.axis]) {
        throw new Error(`[Sortable]: Items must occupy the same amount of space along the sort axis (${this.axis}). This item: ${model.size[this.axis]}px. Previous Item(s): ${this.cellSize}px`);
      }
    }

    cacheContainerProps() {

      this.container[Expando] = {
        originalStyles: this.container.getAttribute('style') || '',
        initialScroll: {
          left: this.container.scrollLeft,
          top: this.container.scrollTop
        }
      }

    }

    clearContainerCache() {
      this.container[Expando] = null;
    }

    setContainerProps() {

      // Disable Touch-Scrolling and selection on the container
      this.container.style.WebkitOverflowScrolling = 'auto';
      this.container.style.touchAction = this.axis === 'x' ? 'pan-y' : 'pan-x';
      this.container.style.WebkitUserSelect = 'none';
      this.container.style.MozUserSelect = 'none';
      this.container.style.userSelect = 'none';

      // Set Class on Container
      this.container.classList.add(this.containerSortingClass);

      // Set scroll positions to cached scroll positions
      this.container.scrollTop = this.container[Expando].initialScroll.top;
      this.container.scrollLeft = this.container[Expando].initialScroll.left;

    }

    unsetContainerProps() {
      this.container.setAttribute('style', this.container[Expando].originalStyles);
      this.container.classList.remove(this.containerSortingClass);
    }

  }

  /** ------------ Plugin Public API ------------ */
  Object.assign(lib.ui, {

    Sortable(options) {

      const sortable = new Sortable(options);

      return {
        activate: () => sortable.activate(),
        deactivate: () => sortable.deactivate()
      };

    }

  });

  /** ------------ Plugin Extension Point ------------ */
  return {
    classify: classify // Very! bad and wrong example. lol
  };

}, false);