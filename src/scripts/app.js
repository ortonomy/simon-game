/*jshint esnext: true */
'use esnext';

/*
    SIMON GAME
    by Gregory Orton 2017
    Github: @ortonomy
    Twitter: @ortonomy_
*/

(function () {
    'use strict';

    // allow :active pseudo classes in safari
    document.addEventListener("touchstart", function(){}, true);

    // Modal controller
    const Modal = {
        show: function (content) {
            let modal = document.createElement('div');
            modal.classList.add('modal-overlay');
            modal.innerHTML = content || '';
            modal.addEventListener('click', function hide () {
                Modal.hide();
            }, false);
            (document.getElementsByTagName('body'))[0].appendChild(modal);
            window.setTimeout( () => {
                (document.getElementsByClassName('info-wrapper'))[0].style.transform = 'translateY(0)';
                (document.getElementsByClassName('info-wrapper'))[0].style.opacity = 1;
            },50);

        },
        hide: function () {
            (document.getElementsByTagName('body'))[0].removeChild((document.getElementsByClassName('modal-overlay'))[0]);
        }
    };

    // an object for creating the project info template that will display in the modal
    const projectTemplater = {
        info: {
            title: `Simon game`,
            subtitle: `A browser-based version of the classic 70s-80s hand-held memory game.`,
            blurb: `Remember the sequence of lights and sounds, then press the buttons in the same order. See if you can achieve victory with a score of 20!`,
            projectFeatures: [
                `First, switch the device on, and then begin a game by pressing the start button.`,
                `Switch on 'strict' mode to play the game in a way where every mistake resets your score.`,
                `Developed using vanilla Javascript, CSS3, SCSS mixins, and the WebAudio API.`
            ],
            author: {
                name: `Gregory Orton`,
                github: {
                    user: `@ortonomy`,
                    url: `https://github.com/ortonomy`
                },
                twitter: {
                    user: `@ortonomy_`,
                    url: `https://twitter.com/ortonomy_`
                },
                email: `dev \\at\\ ortonomy.co`
            }
        },
        getProjectTemplate: projectInfo => `
            <div class="info-wrapper">
                <h1 class="project-title">${projectInfo.title}</h1>
                <h2 class="project-info-text project-subtitle">${projectInfo.subtitle}</h2>
                <div class="project-details-wrapper">
                    <p class="project-info-text project-blurb">${projectInfo.blurb}</p>
                    <ul class="project-info-text project-features">
                        ${projectInfo.projectFeatures.map(feature => `
                            <li class="project-feature">${feature}</li>
                        `).join('')}
                    </ul>
                </div>
                <hr>
                <div class="project-info-text contact-wrapper">
                    <p class='contact-signature'>Made with <i class="fa fa-heart"></i> by ${projectInfo.author.name}.</p>
                    <a class="contact-link" href="${projectInfo.author.github.url}" target="_blank"><span class="github-contact-wrapper"><i class="fa fa-github"></i></span></a>&nbsp;<a class="contact-link" href="${projectInfo.author.twitter.url}" target="_blank"><span class="twitter-contact-wrapper"><i class="fa fa-twitter"></i></span></a>&nbsp;&nbsp;<span class="mail-contact">${projectInfo.author.email}</span>
                </div>
            </div>
        `
    };

    // bind the click event for the pop-up modal
    (document.getElementsByClassName('logo'))[0].addEventListener('click', function add (e) {
        e.preventDefault();
        Modal.show(projectTemplater.getProjectTemplate(projectTemplater.info));
    }, false);

    // set up sounds for the game
    const AudioGenerator = () => {
        // browser compatibility for WebAudio API
        window.AudioContext = window.AudioContext || window.webkitAudioContext || false;
        // check if we should continue
        if ( !window.AudioContext ) {
            return alert('Your browser is not compatible with the web audio API. Please consider upgrading.');
        }

        //  settings for Audio Nodes
        let settings = {
            fade: 0.05
        };

        //  audio frequencies for the oscillator nodes
        let frequencies = {
            red: {
                value: 329.63,
                type: 'sine'
            },
            green: {
                value: 261.63,
                type: 'sine'
            },
            blue:  {
                value: 220,
                type: 'sine'
            },
            yellow: {
                value: 164.81,
                type: 'sine'
            },
            error: {
                value: 110,
                type: 'triangle'
            }
        };

        // create audio context
        let AudioContext = new window.AudioContext();
        // create source node to generate frequencies and init default sound to error
        let oscNode = AudioContext.createOscillator();
        oscNode.start(0.0);
        // create volume control node and set default volume to 0;
        let gainNode = AudioContext.createGain();
        gainNode.gain.value = 0;
        // connect the up the audio subsystem
        oscNode.connect(gainNode);
        gainNode.connect(AudioContext.destination);

        return {
            play: (name) => {
                oscNode.frequency.value = frequencies[name].value;
                oscNode.type = frequencies[name].type;
                gainNode.gain.linearRampToValueAtTime(1,AudioContext.currentTime + settings.fade);
            },
            stop: () => {
                gainNode.gain.linearRampToValueAtTime(0,AudioContext.currentTime + settings.fade);
            }
        };
    };

    // create the audio controller
    const audioControl = AudioGenerator();

    // display controller
    const Display = {
        _self: document.querySelector('.count-text'),
        blank: '!!!',
        clear: () => {
            Display._self.innerHTML = Display.blank;
        },
        ready: () => {
            Display._self.innerHTML = '---';
        },
        showMessage: (message) => {
            switch (message.length) {
                case 3:
                    Display._self.innerHTML = message;
                    break;
                case 2:
                    Display._self.innerHTML = '-' + message;
                    break;
                case 1:
                    Display._self.innerHTML = '--' + message;
                    break;
                default:
                    Display._self.innerHTML = '---';
                    break;
            }
        },
        flashMessage: (message, count, callback) => {
            let timer = null;
            let counter = count;
            let cb = callback || undefined;
            const messageHandler = (message)  => {

                if ( counter % 2 !== 0 ) {
                    Display.clear();
                }
                else {
                    Display.showMessage(message);
                }
                counter --;
                if ( counter === 0 ) {
                    clearInterval(timer);
                    if (cb) { cb(); }
                }
            };
            timer = setInterval( messageHandler.bind(null, message),500);
        }
    };

    // all game data
    let Game = {
        colors: [
            'red',
            'green',
            'blue',
            'yellow'
        ],
        status: {
            sequence: [],
            power: false,
            strict: false,
            stage: null,
            lastPush: null,
            userInputTimer: null,
            errorTimer: null,
            showTimer: null,
            userProgress: null
        },
        settings: {
            winThreshold: 20
        },
        softReset: () => {
            console.log('soft resetting'); // DEBUG
            // Reset game settings
            Game.status.sequence = [];
            Game.status.stage = 'ready';
            Game.status.lastPush = null;
            Game.clearTimer(Game.status.errorTimer);
            Game.clearTimer(Game.status.userInputTimer);
            Game.clearTimer(Game.status.showTimer);
            Game.dimAll();
            Game.status.errorTimer = null;
        },
        hardReset: () => {
            console.log('hard resetting'); // DEBUG
            // reset strict setting and then call soft reset
            Game.toggleStrict(true);
            Game.softReset();
        },
        off: () => {

            Game.hardReset();
            Game.status.stage = null;
            Game.status.power = false;
            // add classes to disable control buttons
            Game.disable(document.querySelector('.start.control'), true);
            Game.disable(document.querySelector('.strict.control'), true);
            console.log('powering off...'); // DEBUG
        },
        on: () => {
            Game.status.power = true;
            // remove disabled classes on the two control buttons
            Game.enable(document.querySelector('.start.control'), true);
            Game.enable(document.querySelector('.strict.control'), true);
            console.log('powering on...'); // DEBUG
        },
        enable: (node, parent) => {
            if ( parent ) {
                node.parentNode.classList.remove('disabled');
                return true;
            }
            node.classList.remove('disabled');
            return true;
        },
        disable: (node, parent) => {
            if ( parent ) {
                node.parentNode.classList.add('disabled');
                return true;
            }
            node.classList.add('disabled');
            return true;
        },
        toggleStrict: (forceUncheck) => {
            let strictControl = document.querySelector('.strict.control');
            if ( forceUncheck ) {
                strictControl.checked = false;
                Game.status.strict = false;
                return false;
            }
            if ( strictControl.checked ) {
                Game.status.strict = true;
                return true;
            }
            Game.status.strict = false;
            return false;
        },
        togglePower: () => {
            console.log('toggling power'); // DEBUG
            if ( Game.status.power ) {
                Game.off();
                Display.clear();
                return false;
            }
            Game.on();
            Game.hardReset();
            Display.showMessage('Hey');
            return true;
        },
        lockUserInput: () => {
            console.log('locking user input');
            (document.querySelectorAll('.quarter')).forEach( (el) => {
                Game.disable(el, false);
            });
        },
        unlockUserInput: () => {
            console.log('unlocking user input');
            (document.querySelectorAll('.quarter')).forEach( (el) => {
                Game.enable(el, false);
            });
        },
        setStage: (string) => {
            Game.status.stage = string;
        },
        init: () => {
            // disable the strict button
            Game.disable(document.querySelector('.strict.control'));
            // soft reset (so that we don't ruin whatever strict setting has been selected)
            Game.softReset();
            // set the game from user input
            Game.lockUserInput();
            // set the game state so that the play controller will first generate a new sequence
            Game.setStage('generate');
            // flash game ready message
            Display.flashMessage('---', 6, Game.playController);
        },
        playController: () => {
            // make sure the power is on!
            if ( !Game.status.power ) {
                return false;
            }
            // decide which game stage to process
            switch ( Game.status.stage ) {
                case 'generate':
                    if ( Game.addSequence() ) {
                        Game.setStage('show');
                        Game.playController();
                        return true;
                    }
                    Game.win();
                    break;
                case 'show':
                    // display the sequence to the user
                    Game.showSequence();
                    break;
                case 'input':
                    Game.resetUserProgress();
                    Game.waitForInput();
                    break;
                case 'error':
                    Game.fail();
                    break;
                default:
                    break;
            }
        },
        addSequence: () => {
            if ( Game.status.sequence.length !== Game.settings.winThreshold ) {
                Game.status.sequence.push(Game.getColor());
                return true;
            }
            return false;
        },
        getColor: () => {
            return Game.colors[Math.floor(Math.random()*4)];
        },
        showSequence: () => {
            // set the display to current round
            Display.showMessage(Game.status.sequence.length < 10 ? '0' + Game.status.sequence.length : Game.status.sequence.length.toString() );
            let index = 0;
            Game.status.showTimer = window.setInterval( () => {
                // dim the last one
                if ( index > 0 ) {
                    Game.dim(Game.status.sequence[index-1]);
                }
                // then wait 250 milliseconds to light the next one
                window.setTimeout( () => {
                    if ( index < Game.status.sequence.length ) {
                        Game.light(Game.status.sequence[index]);
                    }
                    if ( index === Game.status.sequence.length ) {
                        Game.clearTimer(Game.status.showTimer);
                        Game.unlockUserInput();
                        Game.setStage('input');
                        Game.playController();
                    }
                    index++;
                },250);
            },1000);
        },
        light: (color) => {
            console.log('Lighting up: ' + color);
            (document.querySelector(`.quarter.${color}`)).classList.toggle(`${color}-light`);
            audioControl.play(`${color}`);
        },
        dim: (color) => {
            console.log('Dimming: ' + color);
            const light = document.querySelector(`.quarter.${color}-light`);
            if ( light ) {
                light.classList.toggle(`${color}-light`);
            }
            audioControl.stop();
        },
        waitForInput: () => {
            // debounce any existing timer
            Game.clearTimer(Game.status.userInputTimer);
            // set a timeout for user failure
            Game.status.userInputTimer = window.setTimeout( () => {
                // clear this timeout
                Game.clearTimer(Game.status.userInputTimer);
                Game.setStage('error');
                Game.playController();
            },2000);
        },
        clearTimer: (timer) => {
            window.clearTimeout(timer);
            window.clearInterval(timer);
        },
        userGameClick: (target) => {
            // Event delegation - make sure we've clicked one of the four coloured buttons
            if ( target.classList.contains('quarter') ) {
                console.log('colour clicked'); // DEBUG
                // find the colour we clicked and store it
                Game.status.lastPush = Array.prototype.filter.call(target.classList, (el) => {
                    for ( let i = 0; i < Game.colors.length; i++ ){
                        if ( el === Game.colors[i] ) {
                            return el;
                        }
                    }
                });
                // check to see if it matches current sequence index
                console.log('players progress is: ' + Game.status.userProgress);
                console.log('user last push was: ' + Game.status.lastPush);
                console.log('sequence is: ' + Game.status.sequence[Game.status.userProgress]);
                if ( Game.status.lastPush.toString() === Game.status.sequence[Game.status.userProgress].toString() ){
                    console.log('A successful match!');
                    // check to see if user wins this round
                    if ( Game.status.userProgress === Game.status.sequence.length - 1 ) {
                        Game.clearTimer(Game.status.userInputTimer);
                        Game.setStage('generate');
                        Game.playController();
                        return true;
                    }
                    // increase user progress
                    Game.status.userProgress++;
                    // wait for
                    Game.waitForInput();
                    return true;
                }
                Game.fail();
                return true;
            }
            console.log('input probably locked'); // DEBUG
            return false;
        },
        resetUserProgress: () => {
            Game.status.userProgress = 0;
        },
        fail: () => {
            console.log('running fail routine');
            // lock the user from inputting anything
            Game.lockUserInput();
            // clear any timers
            Game.clearTimer(Game.status.showTimer);
            Game.clearTimer(Game.status.userInputTimer);
            Game.clearTimer(Game.status.errorTimer);
            // play an error noise
            audioControl.play('error');
            // light up all lights
            Game.lightAll();
            // show error message
            Display.showMessage('NO');
            // delay and then process result of failure
            Game.status.errorTimer = window.setTimeout( () => {
                console.log('inside error timeout');
                // stop the error noise
                audioControl.stop();
                // turn off the lights!
                Game.dimAll();
                // wait a littler before we reshow
                window.setTimeout( () => {
                    // decide what to do based on strict mode setting
                    if ( Game.status.strict ) {
                        // honour the strict setting
                        Game.init();
                    } else {
                        Game.setStage('show');
                        Game.playController();
                    }
                },500);
            },1250);
        },
        win: () => {
            console.log('Player wins');
            Game.lightAll();
            Display.flashMessage('Gr8',6,Game.softReset);
        },
        lightAll: () => {
            Game.colors.forEach( (el) => {
                Game.light(el);
            });
        },
        dimAll: () => {
            Game.colors.forEach( (el) => {
                Game.dim(el);
            });
        }
    };

    // power switch click bind
    document.querySelector('.power.label').addEventListener('click', function powerOn () {
        Game.togglePower();
    },true);

    // bind click to strict button
    (document.querySelector('.strict.control')).addEventListener('click', function strictClick () {
        Game.toggleStrict();
    },false);

    // bind click to start button
    (document.querySelector('.start.control')).addEventListener('click', function startClick () {
        Game.init();
    },false);

    // bind user click events
    (document.querySelector('.game-area')).addEventListener('click', function userClick(e) {
        Game.userGameClick(e.target);
    },true);

})();
