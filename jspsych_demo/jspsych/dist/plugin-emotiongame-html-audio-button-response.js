var jsPsychEmotiongameHtmlAudioButtonResponse = (function (jspsych) {
  'use strict';

  const info = {
      name: "html-button-response",
      parameters: {
          /** The HTML string to be displayed */
          stimulus: {
              type: jspsych.ParameterType.HTML_STRING,
              pretty_name: "Stimulus",
              default: undefined,
          },
          /** The audio to be played. */
          audio: {
            type: jspsych.ParameterType.AUDIO,
            pretty_name: "Audio",
            default: undefined,
        },
          /** Array containing the label(s) for the button(s). */
          choices: {
              type: jspsych.ParameterType.STRING,
              pretty_name: "Choices",
              default: undefined,
              array: true,
          },
          /** The HTML for creating button. Can create own style. Use the "%choice%" string to indicate where the label from the choices parameter should be inserted. */
          button_html: {
              type: jspsych.ParameterType.HTML_STRING,
              pretty_name: "Button HTML",
              default: '<button class="jspsych-btn">%choice%</button>',
              array: true,
          },
          /** Any content here will be displayed under the button(s). */
          prompt: {
              type: jspsych.ParameterType.HTML_STRING,
              pretty_name: "Prompt",
              default: null,
          },
          /** How long to show the stimulus. */
          stimulus_duration: {
              type: jspsych.ParameterType.INT,
              pretty_name: "Stimulus duration",
              default: null,
          },
          /** How long to show the trial. */
          trial_duration: {
              type: jspsych.ParameterType.INT,
              pretty_name: "Trial duration",
              default: null,
          },
          /** The vertical margin of the button. */
          margin_vertical: {
              type: jspsych.ParameterType.STRING,
              pretty_name: "Margin vertical",
              default: "0px",
          },
          /** The horizontal margin of the button. */
          margin_horizontal: {
              type: jspsych.ParameterType.STRING,
              pretty_name: "Margin horizontal",
              default: "8px",
          },
          /** If true, then trial will end when user responds. */
          response_ends_trial: {
              type: jspsych.ParameterType.BOOL,
              pretty_name: "Response ends trial",
              default: true,
          },
      },
  };
  /**
   * html-button-response
   * jsPsych plugin for displaying a stimulus and getting a button response
   * @author Josh de Leeuw
   * @see {@link https://www.jspsych.org/plugins/jspsych-html-button-response/ html-button-response plugin documentation on jspsych.org}
   */
  class EmotiongameHtmlAudioButtonResponsePlugin {
      constructor(jsPsych) {
          this.jsPsych = jsPsych;
      }
      trial(display_element, trial, on_load) {
        let trial_complete;
        var context = this.jsPsych.pluginAPI.audioContext();
        // record webaudio context start time
        var startTime;
        // load audio file
        this.jsPsych.pluginAPI
            .getAudioBuffer(trial.audio)
            .then((buffer) => {
            if (context !== null) {
                this.audio = context.createBufferSource();
                this.audio.buffer = buffer;
                this.audio.connect(context.destination);
            }
            else {
                this.audio = buffer;
                this.audio.currentTime = 0;
            }
            setupTrial();

            document.getElementById('tapping-btn');

        })
            .catch((err) => {
            console.error(`Failed to load audio file "${trial.audio}". Try checking the file path. We recommend using the preload plugin to load audio files.`);
            console.error(err);
        });
        
        const setupTrial = () => {
            // set up end event if trial needs it
            if (trial.trial_ends_after_audio) {
                this.audio.addEventListener("ended", end_trial);
            }
            // enable buttons after audio ends if necessary
            if (!trial.response_allowed_while_playing && !trial.trial_ends_after_audio) {
                this.audio.addEventListener("ended", enable_buttons);
            }

                // display stimulus
            var html = '<div id="jspsych-emotiongame-html-audio-button-response-stimulus">' + trial.stimulus + "</div>";
            //display buttons
            var buttons = [];
            if (Array.isArray(trial.button_html)) {
                if (trial.button_html.length == trial.choices.length) {
                    buttons = trial.button_html;
                }
                else {
                    console.error("Error in html-button-response plugin. The length of the button_html array does not equal the length of the choices array");
                }
            }
            else {
                for (var i = 0; i < trial.choices.length; i++) {
                    buttons.push(trial.button_html);
                }
            }
            html += '<div id="jspsych-html-button-response-btngroup">';
            for (var i = 0; i < trial.choices.length; i++) {
                var str = buttons[i].replace(/%choice%/g, trial.choices[i].img);
                html +=
                    '<div class="jspsych-html-button-response-button" style="display: inline-block; margin:' +
                        trial.margin_vertical +
                        " " +
                        trial.margin_horizontal +
                        '" id="jspsych-html-button-response-button-' +
                        i +
                        '" data-choice="' +
                        i +
                        '">' +
                        str +
                        '<h2 style="margin:0">' + trial.choices[i].type + '</h2>' +
                        "</div>";
            }
            html += "</div>";
            //show prompt if there is one
            if (trial.prompt !== null) {
                html += trial.prompt;
            }
            display_element.innerHTML = html;

            if (trial.response_allowed_while_playing) {
                enable_buttons();
            }
            //else {
              //disable_buttons();
            //}
            // start time
            startTime = performance.now();
            // start audio
            if (context !== null) {
                startTime = context.currentTime;
                this.audio.start(startTime);
            }
            else {
                this.audio.play();
            }

            on_load();
        };

        
          // add event listeners to buttons
          for (var i = 0; i < trial.choices.length; i++) {
              display_element
                  .querySelector("#jspsych-html-button-response-button-" + i)
                  .addEventListener("click", (e) => {
                  var btn_el = e.currentTarget;
                  var choice = btn_el.getAttribute("data-choice"); // don't use dataset for jsdom compatibility
                  after_response(choice);
              });
          }
          // store response
          var response = {
              rt: null,
              button: null,
          };
          // function to end trial when it is time
          const end_trial = () => {
              // kill any remaining setTimeout handlers
              this.jsPsych.pluginAPI.clearAllTimeouts();
              // stop the audio file if it is playing
              // remove end event listeners if they exist
              if (context !== null) {
                this.audio.stop();
            }
            else {
                this.audio.pause();
            }
            this.audio.removeEventListener("ended", end_trial);
            this.audio.removeEventListener("ended", enable_buttons);
              // gather the data to store for the trial
              var trial_data = {
                  rt: response.rt,
                  stimulus: trial.stimulus,
                  response: response.button,
              };
              // clear the display
              display_element.innerHTML = "";
              // move on to the next trial
              this.jsPsych.finishTrial(trial_data);
          };
          function button_response(e) {
            var choice = e.currentTarget.getAttribute("data-choice"); // don't use dataset for jsdom compatibility
            after_response(choice);
        }
          function disable_buttons() {
            var btns = document.querySelectorAll(".jspsych-audio-button-response-button");
            for (var i = 0; i < btns.length; i++) {
                var btn_el = btns[i].querySelector("button");
                if (btn_el) {
                    btn_el.disabled = true;
                }
                btns[i].removeEventListener("click", button_response);
            }
        }  
        function enable_buttons() {
            var btns = document.querySelectorAll(".jspsych-audio-button-response-button");
            for (var i = 0; i < btns.length; i++) {
                var btn_el = btns[i].querySelector("button");
                if (btn_el) {
                    btn_el.disabled = false;
                }
                btns[i].addEventListener("click", button_response);
            }
        }
        return new Promise((resolve) => {
            trial_complete = resolve;
        });
        
          // function to handle responses by the subject
          function after_response(choice) {
              // measure rt
              var end_time = performance.now();
              var rt = Math.round(end_time - start_time);
              response.button = parseInt(choice);
              response.rt = rt;
              // after a valid response, the stimulus will have the CSS class 'responded'
              // which can be used to provide visual feedback that a response was recorded
              display_element.querySelector("#jspsych-html-button-response-stimulus").className +=
                  " responded";
              // disable all the buttons after a response
              var btns = document.querySelectorAll(".jspsych-html-button-response-button button");
              for (var i = 0; i < btns.length; i++) {
                  //btns[i].removeEventListener('click');
                  btns[i].setAttribute("disabled", "disabled");
              }
              if (trial.response_ends_trial) {
                  end_trial();
              }
          }
          // hide image if timing is set
          if (trial.stimulus_duration !== null) {
              this.jsPsych.pluginAPI.setTimeout(() => {
                  display_element.querySelector("#jspsych-html-button-response-stimulus").style.visibility = "hidden";
              }, trial.stimulus_duration);
          }
          // end trial if time limit is set
          if (trial.trial_duration !== null) {
              this.jsPsych.pluginAPI.setTimeout(end_trial, trial.trial_duration);
          }
      }
      simulate(trial, simulation_mode, simulation_options, load_callback) {
          if (simulation_mode == "data-only") {
              load_callback();
              this.simulate_data_only(trial, simulation_options);
          }
          if (simulation_mode == "visual") {
              this.simulate_visual(trial, simulation_options, load_callback);
          }
      }
      create_simulation_data(trial, simulation_options) {
          const default_data = {
              stimulus: trial.stimulus,
              rt: this.jsPsych.randomization.sampleExGaussian(500, 50, 1 / 150, true),
              response: this.jsPsych.randomization.randomInt(0, trial.choices.length - 1),
          };
          const data = this.jsPsych.pluginAPI.mergeSimulationData(default_data, simulation_options);
          this.jsPsych.pluginAPI.ensureSimulationDataConsistency(trial, data);
          return data;
      }
      simulate_data_only(trial, simulation_options) {
          const data = this.create_simulation_data(trial, simulation_options);
          this.jsPsych.finishTrial(data);
      }
      simulate_visual(trial, simulation_options, load_callback) {
          const data = this.create_simulation_data(trial, simulation_options);
          const display_element = this.jsPsych.getDisplayElement();
          this.trial(display_element, trial);
          load_callback();
          const respond = () => {
            if (data.rt !== null) {
                this.jsPsych.pluginAPI.clickTarget(display_element.querySelector(`div[data-choice="${data.response}"] button`), data.rt);
            }
        };
        this.trial(display_element, trial, () => {
            load_callback();
            if (!trial.response_allowed_while_playing) {
                this.audio.addEventListener("ended", respond);
            }
            else {
                respond();
            }
        });
      }
  }
  EmotiongameHtmlAudioButtonResponsePlugin.info = info;

  return EmotiongameHtmlAudioButtonResponsePlugin;

})(jsPsychModule);
