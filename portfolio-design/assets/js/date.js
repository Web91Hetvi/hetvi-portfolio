const easing = {
    easeOutCubic: function (pos) {
        return (Math.pow((pos - 1), 3) + 1);
    },
    easeOutQuart: function (pos) {
        return -(Math.pow((pos - 1), 4) - 1);
    },
    easeInOutQuint: function (pos) {
        if ((pos /= 0.5) < 1) return 0.5 * Math.pow(pos, 5);
        return 0.5 * (Math.pow((pos - 2), 5) + 2);
    },
    easeInOutSine: function (pos) {
        return (-0.5 * (Math.cos(Math.PI * pos) - 1));
    },
    easeInOutExpo: function (pos) {
        if (pos === 0) return 0;
        if (pos === 1) return 1;
        if ((pos /= 0.5) < 1) return 0.5 * Math.pow(2, 10 * (pos - 1));
        return 0.5 * (-Math.pow(2, -10 * --pos) + 2);
    }
};

class IosSelector {
    constructor(options) {
        let defaults = {
            el: '', // dom
            type: 'infinite', // infinite infinite scrolling, normal non-infinite
            count: 4, // Ring specifications, the number of options on the ring, must be set to a multiple of 4
            sensitivity: 0.4, // Sensitivity
            source: [], // Options {value: xx, text: xx}
            value: null,
            onChange: null
        };

        this.options = Object.assign({}, defaults, options);
        this.options.count = this.options.count - this.options.count % 4;
        Object.assign(this, this.options);

        this.halfCount = this.options.count / 2;
        this.quarterCount = this.options.count / 4;
        this.a = this.options.sensitivity * 10; // rolling deceleration
        this.minV = Math.sqrt(1 / this.a); // minimum initial velocity
        this.selected = this.source[0];

        this.exceedA = 10; // deceleration exceeded
        this.moveT = 0; // scroll tick
        this.moving = false;

        this.elems = {
            el: document.querySelector(this.options.el),
            circleList: null,
            circleItems: null, // list

            highlight: null,
            highlightList: null,
            highListItems: null // list
        };
        this.events = {
            touchstart: null,
            touchmove: null,
            touchend: null,
            click: null
        };

        this.itemHeight = this.elems.el.offsetHeight * 3 / this.options.count; // height of each item
        this.itemAngle = 360 / this.options.count; // The degree of rotation between each item
        this.radius = this.itemHeight / Math.tan(this.itemAngle * Math.PI / 180); // Ring radius

        this.scroll = 0; // The unit is the height of an item (degrees)
        this._init();
    }

    _init() {
        this._create(this.options.source);

        let touchData = {
            startY: 0,
            yArr: []
        };

        for (let eventName in this.events) {
            this.events[eventName] = ((eventName) => {
                return (e) => {
                    if (this.elems.el.contains(e.target) || e.target === this.elems.el) {
                        e.preventDefault();
                        if (this.source.length) {
                            this['_' + eventName](e, touchData);
                        }
                    }
                };
            })(eventName);
        }

        this.elems.el.addEventListener('touchstart', this.events.touchstart);
        document.addEventListener('mousedown', this.events.touchstart);
        this.elems.el.addEventListener('touchend', this.events.touchend);
        document.addEventListener('mouseup', this.events.touchend);
        document.addEventListener('mouseup', this.events.touchend);
        document.addEventListener('click', this.events.click);
        if (this.source.length) {
            this.value = this.value !== null ? this.value : this.source[0].value;
            this.select(this.value);
        }
    }

    _touchstart(e, touchData) {
            this.elems.el.addEventListener('touchmove', this.events.touchmove);
            document.addEventListener('mousemove', this.events.touchmove);
            let eventY = e.clientY || e.touches[0].clientY;
            touchData.startY = eventY;
            touchData.yArr = [[eventY, new Date().getTime()]];
            touchData.touchScroll = this.scroll;
            this._stop();

    }

    _touchmove(e, touchData) {
        let eventY = e.clientY || e.touches[0].clientY;
        touchData.yArr.push([eventY, new Date().getTime()]);
        if (touchData.length > 5) {
            touchData.unshift();
        }

        let scrollAdd = (touchData.startY - eventY) / this.itemHeight;
        let moveToScroll = scrollAdd + this.scroll;

        // When not infinite scrolling, going out of range makes scrolling difficult
        if (this.type === 'normal') {
            if (moveToScroll < 0) {
                moveToScroll *= 0.1;
            } else if (moveToScroll > this.source.length) {
                moveToScroll = this.source.length + (moveToScroll - this.source.length) * 0.1;
            }
            // console.log(moveToScroll);
        } else {
            moveToScroll = this._normalizeScroll(moveToScroll);
        }

        touchData.touchScroll = this._moveTo(moveToScroll);
    }

    _touchend(e, touchData) {
        // console.log(e);
        this.elems.el.removeEventListener('touchmove', this.events.touchmove);
        document.removeEventListener('mousemove', this.events.touchmove);

        let v;

        if (touchData.yArr.length === 1) {
            v = 0;
        } else {
            let startTime = touchData.yArr[touchData.yArr.length - 2][1];
            let endTime = touchData.yArr[touchData.yArr.length - 1][1];
            let startY = touchData.yArr[touchData.yArr.length - 2][0];
            let endY = touchData.yArr[touchData.yArr.length - 1][0];

            v = ((startY - endY) / this.itemHeight) * 1000 / (endTime - startTime);
            let sign = v > 0 ? 1 : -1;

            v = Math.abs(v) > 30 ? 30 * sign : v;
        }

        this.scroll = touchData.touchScroll;
        this._animateMoveByInitV(v);

        // console.log('end');
    }

    _click(e, touchData) {
        if (!this.moving) {
            let selectWrap = e.target.closest('.select-wrap');

            if (selectWrap) {

                let clickedElement = e.target.closest('.select-options li.select-option');
                let clickedElement1 = e.target.closest('.highlight-list li.highlight-item');

                if (clickedElement) {
                    let value = clickedElement.getAttribute('value');
                    this.select(parseInt(value));
                } else if (clickedElement1) {
                    let value = clickedElement1.getAttribute('value');
                    this.select(parseInt(value));
                } else {
                  //  console.log("Clicked outside the options.");

                }
            }
        }
    }

    _touchClick(e, touchData) {
        if (!this.moving) {
            let selectWrap = e.target.closest('.select-wrap');


            if (selectWrap) {
                let clickedElement = e.target.closest('.select-options li.select-option');
                let clickedElement1 = e.target.closest('.highlight-list li.highlight-item');

                if (clickedElement) {
                    let value = clickedElement.getAttribute('value');
                    this.select(parseInt(value));
                } else if (clickedElement1) {
                    let value = clickedElement1.getAttribute('value');
                    this.select(parseInt(value));
                } else {
                  //  console.log("Touched outside the options.");
                }
            }
        }
    }


    _create(source) {

        if (!source.length) {
            return;
        }

        let template = `
      <div class="select-wrap">
        <ul class="select-options" style="transform: translate3d(0, 0, ${-this.radius}px) rotateX(0deg);">
          {{circleListHTML}}
          <!-- <li class="select-option">a0</li> -->
        </ul>
        <div class="highlight">
          <ul class="highlight-list">
            <!-- <li class="highlight-item"></li> -->
            {{highListHTML}}
          </ul>
        </div>
      </div>
    `;

        // source deal with
        if (this.options.type === 'infinite') {
            let concatSource = [].concat(source);
            while (concatSource.length < this.halfCount) {
                concatSource = concatSource.concat(source);
            }
            source = concatSource;
        }
        this.source = source;
        let sourceLength = source.length;

        // ring HTML
        let circleListHTML = '';
        for (let i = 0; i < source.length; i++) {
            circleListHTML += `<li class="select-option"
                    style="
                      top: ${this.itemHeight * -0.5}px;
                      height: ${this.itemHeight}px;
                      line-height: ${this.itemHeight}px;
                      transform: rotateX(${-this.itemAngle * i}deg) translate3d(0, 0, ${this.radius}px);
                    "
                    value="${source[i].value}"
                    id="${source[i].value}-id"
                    data-index="${i}"
                    >${source[i].text}</li>`
        }

        // Highlight in the middle HTML
        let highListHTML = '';
        for (let i = 0; i < source.length; i++) {
            highListHTML += `<li class="highlight-item" style="height: ${this.itemHeight}px;"
                     value="${source[i].value}"
                    id="${source[i].value}-id">
                        ${source[i].text}
                      </li>`
        }


        if (this.options.type === 'infinite') {

            // Ring head and tail
            for (let i = 0; i < this.quarterCount; i++) {
                // head
                circleListHTML = `<li class="select-option"
                      style="
                        top: ${this.itemHeight * -0.5}px;
                        height: ${this.itemHeight}px;
                        line-height: ${this.itemHeight}px;
                        transform: rotateX(${this.itemAngle * (i + 1)}deg) translate3d(0, 0, ${this.radius}px);
                      "
                      data-index="${-i - 1}"
                      >${source[sourceLength - i - 1].text}</li>` + circleListHTML;
                // tail
                circleListHTML += `<li class="select-option"
                      style="
                        top: ${this.itemHeight * -0.5}px;
                        height: ${this.itemHeight}px;
                        line-height: ${this.itemHeight}px;
                        transform: rotateX(${-this.itemAngle * (i + sourceLength)}deg) translate3d(0, 0, ${this.radius}px);
                      "
                      data-index="${i + sourceLength}"
                      value="${source[i].value}"
                      >${source[i].text}</li>`;
            }

            // Highlight head and tail
            highListHTML = `<li class="highlight-item" style="height: ${this.itemHeight}px;">
                          ${source[sourceLength - 1].text}
                      </li>` + highListHTML;
            highListHTML += `<li class="highlight-item" style="height: ${this.itemHeight}px;" value="${source[0].value}">${source[0].text}</li>`
        }

        this.elems.el.innerHTML = template
            .replace('{{circleListHTML}}', circleListHTML)
            .replace('{{highListHTML}}', highListHTML);
        this.elems.circleList = this.elems.el.querySelector('.select-options');
        this.elems.circleItems = this.elems.el.querySelectorAll('.select-option');


        this.elems.highlight = this.elems.el.querySelector('.highlight');
        this.elems.highlightList = this.elems.el.querySelector('.highlight-list');
        this.elems.highlightitems = this.elems.el.querySelectorAll('.highlight-item');

        if (this.type === 'infinite') {
            this.elems.highlightList.style.top = -this.itemHeight + 'px';
        }

        this.elems.highlight.style.height = this.itemHeight + 'px';
        this.elems.highlight.style.lineHeight = this.itemHeight + 'px';

    }

    /**
     * Modulo scroll, eg source.length = 5 scroll = 6.1
     * After modulo normalizedScroll = 1.1
     * @param {init} scroll
     * @return normalizedScroll after modulo
     */
    _normalizeScroll(scroll) {
        let normalizedScroll = scroll;

        while (normalizedScroll < 0) {
            normalizedScroll += this.source.length;
        }
        normalizedScroll = normalizedScroll % this.source.length;
        return normalizedScroll;
    }

    /**
     * Positioned to scroll, no animation
     * @param {init} scroll
     * @return Returns the scroll after specifying normalize
     */
    // _moveTo(scroll) {
    //     if (this.type === 'infinite') {
    //         scroll = this._normalizeScroll(scroll);
    //     }
    //     this.elems.circleList.style.transform = `translate3d(0, 0, ${-this.radius}px) rotateX(${this.itemAngle * scroll}deg)`;
    //     this.elems.highlightList.style.transform = `translate3d(0, ${-(scroll) * this.itemHeight}px, 0)`;
    //     [...this.elems.circleItems].forEach(itemElem => {
    //         if (Math.abs(itemElem.dataset.index - scroll) > this.quarterCount) {
    //             itemElem.style.visibility = 'hidden';
    //         } else {
    //             itemElem.style.visibility = 'visible';
    //         }
    //     });
    //
    //     // console.log(scroll);
    //     // console.log(`translate3d(0, 0, ${-this.radius}px) rotateX(${-this.itemAngle * scroll}deg)`);
    //     return scroll;
    // }

    _moveTo(scroll) {
        if (this.type === 'infinite') {
            scroll = this._normalizeScroll(scroll);
        }
        this.elems.circleList.style.transform = `translate3d(0, 0, ${-this.radius}px) rotateX(${this.itemAngle * scroll}deg)`;
        this.elems.highlightList.style.transform = `translate3d(0, ${-(scroll) * this.itemHeight}px, 0)`;
        // Loop through each highlight list item and add/remove a class based on the scroll position
        [...this.elems.highlightList.querySelectorAll('.highlight-item')].forEach((itemElem, index) => {
            if (index === scroll) {
                itemElem.classList.add('animate');
            } else {
                itemElem.classList.remove('animate');
            }
        });

        // Loop through each circle item and adjust visibility based on scroll position
        [...this.elems.circleItems].forEach(itemElem => {
            if (Math.abs(itemElem.dataset.index - scroll) > this.quarterCount) {
                itemElem.style.visibility = 'hidden';
            } else {
                itemElem.style.visibility = 'visible';
            }
        });

        return scroll;
    }


    /**
     * Roll with initial velocity initV
     * @param {init} initV, initV will be reset
     * To ensure scrolling to an integer scroll based on acceleration (guaranteed to be able to locate a selected value through scroll)
     */
    async _animateMoveByInitV(initV) {

        // console.log(initV);

        let initScroll;
        let finalScroll;
        let finalV;

        let totalScrollLen;
        let a;
        let t;

        if (this.type === 'normal') {

            if (this.scroll < 0 || this.scroll > this.source.length - 1) {
                a = this.exceedA;
                initScroll = this.scroll;
                finalScroll = this.scroll < 0 ? 0 : this.source.length - 1;
                totalScrollLen = initScroll - finalScroll;

                t = Math.sqrt(Math.abs(totalScrollLen / a));
                initV = a * t;
                initV = this.scroll > 0 ? -initV : initV;
                finalV = 0;
                await this._animateToScroll(initScroll, finalScroll, t);
            } else {
                initScroll = this.scroll;
                a = initV > 0 ? -this.a : this.a; // deceleration acceleration
                t = Math.abs(initV / a); //Reducing speed to 0 takes time
                totalScrollLen = initV * t + a * t * t / 2; // total scroll length
                finalScroll = Math.round(this.scroll + totalScrollLen); // Rounding to ensure accurate final scroll is an integer
                finalScroll = finalScroll < 0 ? 0 : (finalScroll > this.source.length - 1 ? this.source.length - 1 : finalScroll);

                totalScrollLen = finalScroll - initScroll;
                t = Math.sqrt(Math.abs(totalScrollLen / a));
                await this._animateToScroll(this.scroll, finalScroll, t, 'easeOutQuart');
            }

        } else {
            initScroll = this.scroll;

            a = initV > 0 ? -this.a : this.a; // deceleration acceleration
            t = Math.abs(initV / a); // Reducing speed to 0 takes time
            totalScrollLen = initV * t + a * t * t / 2; //Total scroll length
            finalScroll = Math.round(this.scroll + totalScrollLen); // Round to ensure that the final scroll is accurately an integer
            await this._animateToScroll(this.scroll, finalScroll, t, 'easeOutQuart');
        }

        // await this._animateToScroll(this.scroll, finalScroll, initV, 0);

        this._selectByScroll(this.scroll);
    }

    // _animateToScroll(initScroll, finalScroll, t, easingName = 'easeOutQuart') {
    //     if (initScroll === finalScroll || t === 0) {
    //         this._moveTo(initScroll);
    //         return;
    //     }
    //
    //     let start = new Date().getTime() / 6000;
    //     let pass = 0;
    //     let totalScrollLen = finalScroll - initScroll;
    //
    //     // console.log(initScroll, finalScroll, initV, finalV, a);
    //     return new Promise((resolve, reject) => {
    //         this.moving = true;
    //         let tick = () => {
    //             pass = new Date().getTime() / 6000 - start;
    //
    //             if (pass < t) {
    //                 this.scroll = this._moveTo(initScroll + easing[easingName](pass / t) * totalScrollLen);
    //                 this.moveT = requestAnimationFrame(tick);
    //             } else {
    //                 resolve();
    //                 this._stop();
    //                 this.scroll = this._moveTo(initScroll + totalScrollLen);
    //             }
    //         };
    //         tick();
    //     });
    // }
    // _animateToScroll(initScroll, finalScroll, t, easingName = 'easeOutQuart', slowFactor = 1) {
    //     if (initScroll === finalScroll || t === 0) {
    //         this._moveTo(initScroll);
    //         return;
    //     }
    //
    //     let start = new Date().getTime() / 3000;
    //     let pass = 0;
    //     let totalScrollLen = finalScroll - initScroll;
    //
    //     // Adjusting the duration with the slowFactor
    //     t *= slowFactor;
    //
    //     return new Promise((resolve, reject) => {
    //         this.moving = true;
    //         let tick = () => {
    //             pass = new Date().getTime() / 3000 - start;
    //
    //             if (pass < t) {
    //                 this.scroll = this._moveTo(initScroll + easing[easingName](pass / t) * totalScrollLen);
    //                 this.moveT = requestAnimationFrame(tick);
    //             } else {
    //                 resolve();
    //                 this._stop();
    //                 this.scroll = this._moveTo(initScroll + totalScrollLen);
    //             }
    //         };
    //         tick();
    //     });
    // }

    // _animateToScroll(initScroll, finalScroll, t, easingName = 'easeOutQuart', slowFactor = 1) {
    //     if (initScroll === finalScroll || t === 0) {
    //         this._moveTo(initScroll);
    //         return;
    //     }
    //
    //     let start = new Date().getTime();
    //     let pass = 0;
    //     let totalScrollLen = finalScroll - initScroll;
    //
    //     // Adjusting the duration with the slowFactor
    //     t *= slowFactor;
    //
    //     return new Promise((resolve, reject) => {
    //         this.moving = true;
    //         let tick = () => {
    //             pass = new Date().getTime() - start;
    //
    //             if (pass < t) {
    //                 const progress = pass / t;
    //                 const easedProgress = easing[easingName](progress);
    //                 const newPosition = initScroll + easedProgress * totalScrollLen;
    //                 this.scroll = this._moveTo(newPosition);
    //                 this.moveT = requestAnimationFrame(tick);
    //             } else {
    //                 resolve();
    //                 this._stop();
    //                 this.scroll = this._moveTo(finalScroll);
    //             }
    //         };
    //         tick();
    //     });
    // }


    _animateToScroll(initScroll, finalScroll, t, easingName = 'easeOutQuart', slowFactor = 0) {
        if (initScroll === finalScroll || t === 0) {
            this._moveTo(initScroll);
            return;
        }

        let start = new Date().getTime();
        let pass = 0;
        let totalScrollLen = finalScroll - initScroll;

        // Adjusting the duration with the slowFactor
        t *= slowFactor;

        return new Promise((resolve, reject) => {
            this.moving = true;
            let tick = () => {
                pass = new Date().getTime() - start;

                if (pass < t) {
                    const progress = pass / t;
                    const easedProgress = easing[easingName](progress);
                    const newPosition = initScroll + easedProgress * totalScrollLen;
                    this.scroll = this._moveTo(newPosition);
                    this.moveT = requestAnimationFrame(tick);
                } else {
                    resolve();
                    this._stop();
                    this.scroll = this._moveTo(finalScroll);
                }
            };
            tick();
        });
    }



    _stop() {
        this.moving = false;
        cancelAnimationFrame(this.moveT);
    }

    _selectByScroll(scroll) {
        scroll = this._normalizeScroll(scroll) | 0;
        if (scroll > this.source.length - 1) {
            scroll = this.source.length - 1;
            this._moveTo(scroll);
        }
        this._moveTo(scroll);
        this.scroll = scroll;
        this.selected = this.source[scroll];
        this.value = this.selected.value;
        this.onChange && this.onChange(this.selected);
    }

    updateSource(source) {
        this._create(source);

        if (!this.moving) {
            this._selectByScroll(this.scroll);
        }
    }

    select(value, isStart= false) {
        for (let i = 0; i < this.source.length; i++) {
            if (this.source[i].value === value) {
                window.cancelAnimationFrame(this.moveT);
                // this.scroll = this._moveTo(i);
                let initScroll = this._normalizeScroll(this.scroll);
                let finalScroll = i;
                let t = Math.sqrt(Math.abs((finalScroll - initScroll) / this.a));
                if (!isStart){
                    this._animateToScroll(initScroll, finalScroll, t);
                }
                setTimeout(() => this._selectByScroll(i));
                return;
            }
        }
        throw new Error(`can not select value: ${value}, ${value} match nothing in current source`);
    }

    destroy() {
        this._stop();
        // document Event unbundling
        for (let eventName in this.events) {
            this.elems.el.removeEventListener('eventName', this.events[eventName]);
        }
        document.removeEventListener('mousedown', this.events['touchstart']);
        document.removeEventListener('mousemove', this.events['touchmove']);
        document.removeEventListener('mouseup', this.events['touchend']);
        // element removal
        this.elems.el.innerHTML = '';
        this.elems = null;
    }
}

function initializeDatePicker() {

// date logic


    function getYears() {
        let currentYear = new Date().getFullYear();
        let years = [];

        for (let i = currentYear - 100; i < currentYear - 17; i++) {
            years.push({
                value: i,
                text: i
            });
        }
        return years;
    }


    function getMonths(year, language) {
        let months = [];
        for (let i = 0; i < 12; i++) {
            let date = new Date(year, i, 1);
            let monthName = upperFirst(date.toLocaleString(language, { month: 'short' }).replace('.', ''));
            months.push({
                value: i + 1,
                text: monthName
            });
        }
        return months;
    }

    function getDays(year, month) {
        let dayCount = new Date(year, month, 0).getDate();
        let days = [];

        for (let i = 1; i <= dayCount; i++) {
            days.push({
                value: i,
                text: i
            });
        }

        return days;
    }

    function upperFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    let currentYear = new Date().getFullYear();
    let currentMonth = 1;
    let currentDay = 1;
    let currentTimeType = '';
    let currentMoment = 1;
    let currentHour = 1;

    let yearSelector;
    let monthSelector;
    let daySelector;
    let timeTypeSelector;
    let momentSelector;
    let hourSelector;
    let language = $('html').attr('lang');

    yearSource = getYears();
    monthSource = getMonths(2024,language);
    daySource = getDays(currentYear, currentMonth);

    yearSelector = new IosSelector({
        el: '#year1',
        type: 'normal',
        source: yearSource,
        count: 20,
        onChange: (selected) => {
            currentYear = selected.value;
            daySource = getDays(currentYear, currentMonth);
            daySelector.updateSource(daySource);
            $('#gtm_ap_dob_day').val('')
            $('#gtm_ap_dob_day').val(daySelector.value)
            $('#gtp_ap_dob_month').val('')
            $('#gtp_ap_dob_month').val(monthSelector.value)
            $('#gtm_ap_dob_year').val('')
            $('#gtm_ap_dob_year').val(yearSelector.value)
           // console.log(yearSelector.value, monthSelector.value, daySelector.value);
        }
    });

    monthSelector = new IosSelector({
        el: '#month1',
        type: 'normal',
        source: monthSource,
        count: 20,
        onChange: (selected) => {
            currentMonth = selected.value;

            // daySource = getDays(currentYear, currentMonth);
            // daySelector.updateSource(daySource);
            $('#gtm_ap_dob_day').val(daySelector.value)
            $('#gtp_ap_dob_month').val(monthSelector.value)
            $('#gtm_ap_dob_year').val(yearSelector.value)

            if (typeof updateZodiac !== 'undefined' && updateZodiac) {
                updateZodiacImage();
            }
        }
    });

    daySelector = new IosSelector({
        el: '#day1',
        type: 'normal',
        source: [],
        count: 20,
        onChange: (selected) => {
            currentDay = selected.value;
            $('#gtm_ap_dob_day').val(daySelector.value)
            $('#gtp_ap_dob_month').val(monthSelector.value)
            $('#gtm_ap_dob_year').val(yearSelector.value)

            if (typeof updateZodiac !== 'undefined' && updateZodiac) {
                updateZodiacImage();
            }
        }
    });

    let now = new Date();


    setTimeout(function () {
        daySelector.select(now.getDate() , true);
        yearSelector.select(now.getFullYear() - 40, true);
        monthSelector.select(now.getMonth() + 1, true);
    }, );

}

function initializeTimePicker() {

    function getMoment(year) {
        let moments = [];
        for (let i = 0; i <= 59; i++) {
            moments.push({
                value: i,
                text: i
            });
        }
        return moments;
    }


    function getHours() {
        let hours = [];

        for (let i = 1; i <= 12; i++) {
            hours.push({
                value: i,
                text: i
            });
        }
        return hours;
    }

    let TimeTypeSource = [
        {
            text: 'AM',
            value: 0,
        },
        {
            text: 'PM',
            value: 1,
        }
    ];
    let MomentSource = getMoment();
    let HourSource = getHours();

    let currentMonth = 1;
    let currentDay = 1;
    let currentTimeType = '';
    let currentMoment = 1;
    let currentHour = 1;

    let yearSelector;
    let monthSelector;
    let daySelector;
    let timeTypeSelector;
    let momentSelector;
    let hourSelector;

    timeTypeSelector = new IosSelector({
        el: '#timeType1',
        type: 'normal',
        source: TimeTypeSource,
        count: 20,
        onChange: (selected) => {
            currentTimeType = selected.value;
            HourSource = getHours(currentTimeType, currentMoment);
            hourSelector.updateSource(HourSource);
            $('#hour').val(hourSelector.value)
            $('#moment').val(momentSelector.value)
            $('#timeType').val(timeTypeSelector.value)
        }
    });

    momentSelector = new IosSelector({
        el: '#moment1',
        type: 'normal',
        source: MomentSource,
        count: 20,
        onChange: (selected) => {
            currentMoment = selected.value;

            HourSource = getHours(currentTimeType, currentMoment);
            hourSelector.updateSource(HourSource);
            $('#hour').val(hourSelector.value)
            $('#moment').val(momentSelector.value)
            $('#timeType').val(timeTypeSelector.value)
        }
    });

    hourSelector = new IosSelector({
        el: '#hour1',
        type: 'normal',
        source: [],
        count: 20,
        onChange: (selected) => {
            currentHour = selected.value;
            $('#hour').val(hourSelector.value)
            $('#moment').val(momentSelector.value)
            $('#timeType').val(timeTypeSelector.value)
        }
    });


    let now = new Date();

    setTimeout(function () {
        timeTypeSelector.select(now.getHours() >= 12 ? 1 : 0);
        momentSelector.select(now.getMinutes());
        hourSelector.select(now.getHours());
    });

}


// Function to run when the display property changes to block
function handleStepDisplayChange(mutationsList, observer) {

    for (let mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const displayStyle = mutation.target.style.display;
            if (displayStyle === '') {
                // Run the JavaScript code here
                // For example, initialize the date picker
                initializeDatePicker();
            }
        }
    }
}

function handleStepDisplayChangeTime(mutationsList, observer) {

    for (let mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const displayStyle = mutation.target.style.display;
            if (displayStyle === '') {
                // Run the JavaScript code here
                // For example, initialize the date picker
                initializeTimePicker();
            }
        }
    }
}


const config = {attributes: true, attributeFilter: ['style']};

// Create a new observer instance linked to the callback function
const observer = new MutationObserver(handleStepDisplayChange);
const observerTime = new MutationObserver(handleStepDisplayChangeTime);

// Start observing the target node for configured mutations
observer.observe(stepNode, config);
observerTime.observe(stepNodeTime, config);
