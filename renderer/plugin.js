/**
 *
 * Question Unit plugin to render a FTB question
 * @class org.ekstep.questionunit.ftb
 * @extends org.ekstep.contentrenderer.questionUnitPlugin
 * @author Gourav More <gourav_m@tekditechnologies.com>
 */
org.ekstep.questionunitFTB = {};
org.ekstep.questionunitFTB.RendererPlugin = org.ekstep.contentrenderer.questionUnitPlugin.extend({
  _type: 'org.ekstep.questionunit.ftb',
  _isContainer: true,
  _render: true,
  /**
   * renderer:questionunit.ftb:showEventListener.
   * @event renderer:questionunit.ftb:show
   * @memberof org.ekstep.questionunit.ftb
   */
  setQuestionTemplate: function () {
    this._question.template = FTBController.getQuestionTemplate(); // eslint-disable-line no-undef
    FTBController.initTemplate(this);// eslint-disable-line no-undef
  },
  /**
   * Listen show event
   * @memberof org.ekstep.questionunit.ftb
   * @param {Object} event from question set.
   */
  preQuestionShow: function (event) {
    this._super(event);
    this._question.data = FTBController.generateHTML(this._question.data); // eslint-disable-line no-undef
  },
  /**
   * Listen event after display the question
   * @memberof org.ekstep.questionunit.ftb
   * @param {Object} event from question set.
   */
  postQuestionShow: function (event) { // eslint-disable-line no-unused-vars
    FTBController.question = this._question; // eslint-disable-line no-undef

    $(FTBController.constant.qsFtbElement).off('click'); // eslint-disable-line no-undef
    $(FTBController.constant.qsFtbElement).on('click', '.ans-field', FTBController.invokeKeyboard); // eslint-disable-line no-undef

    QSTelemetryLogger.logEvent(QSTelemetryLogger.EVENT_TYPES.ASSESS); // eslint-disable-line no-undef
    /*istanbul ignore else*/
    if (this._question.state && this._question.state.val) {
      FTBController.setStateInput(); // eslint-disable-line no-undef
    }
    FTBController.postQuestionShow();
  },  /**
  * Hides the keyboard
  * @memberof org.ekstep.questionunit.ftb
  * @param {Object} event from question set.
  */
  postHideQuestion: function () {
    EkstepRendererAPI.dispatchEvent("org.ekstep.keyboard:hide");
  },
  /**
   * renderer:questionunit.ftb:evaluateEventListener.
   * @event renderer:questionunit.ftb:evaluate
   * @param {Object} event object from questionset
   * @memberof org.ekstep.questionunit.ftb
   */
  evaluateQuestion: function (event) {
    var telemetryAnsArr = [], //array have all answer
      correctAnswer = false,
      userAnswers = [];
    //check for evalution
    //get all text box value inside the class
    // get copy of the data 
    var data = JSON.parse(JSON.stringify(this._question.data.data));
    var textBoxCollection = $(FTBController.constant.qsFtbQuestion).find("input[type=text]"); // eslint-disable-line no-undef
    _.each(textBoxCollection, function (element, index) {
      var userAns = element.value.toLowerCase().trim();
      userAnswers.push(userAns);
      data.blanks[element.id].userAnswer = userAns;
      var ansObj = {}; ansObj["ans" + index] = element.value;
      telemetryAnsArr.push(ansObj);
    });

    // evaluate the question on this copy
    // check if there are any groups. If so, handle them separately.
    if (data.groups && Object.keys(data.groups).length > 0) {
      _.each(data.groups, function (group, id) {
        // get all the blanks in this group
        var blanksInGroup = {};
        _.each(data.blanks, function (blank, bId) {
          if (blank.group == id)
            blanksInGroup[bId] = blank;
        });
        var expAnswers = _.map(group.answers, function (ansArray) {
          return _.map(ansArray, function (a) {
            return a.trim().toLowerCase().replace(/\s/g, '');
          });
        });
        _.each(blanksInGroup, function (blank, bId) {
          blank.userAnswer = blank.userAnswer.trim().replace(/\s/g, '');
          var matchedIndex = _.findIndex(expAnswers, function (expAns) {
            return _.contains(expAns, blank.userAnswer);
          })
          if (matchedIndex != -1) {
            // there is a match, hence, mark this answer as correct, and also remove the expAns array from expAnswers
            data.blanks[bId].isCorrect = blank.isCorrect = true;
            expAnswers.splice(matchedIndex, 1);
          }
          else {
            data.blanks[bId].isCorrect = blank.isCorrect = false;
          }
        });
      });
    }
    // now evaluate ungrouped blanks
    var ungroupedBlanks = {};
    _.each(data.blanks, function (blank, id) {
      if (!blank.group)
        ungroupedBlanks[id] = blank;
    });
    _.each(ungroupedBlanks, function (blank, id) {
      // trim user answer and remove any embedded white space characters
      blank.userAnswer = blank.userAnswer.trim().replace(/\s/g, '');
      var expAnswers = _.map(blank.answers, function (a) {
        return a.trim().replace(/\s/g, '');
      });
      data.blanks[id].isCorrect = blank.isCorrect = _.contains(expAnswers, blank.userAnswer);
    });

    var allBlanks = _.values(data.blanks);
    correctAnswer = _.every(allBlanks, function (b) { return b.isCorrect; });
    var correctAnswersCount = _.reduce(allBlanks, function (memo, b) { return memo + (b.isCorrect ? 1 : 0); }, 0);

    var factor = (correctAnswersCount / allBlanks.length);
    var questionScore = ((this._question.config.partial_scoring) ? factor : Math.floor(factor)) * this._question.config.max_score
    var result = {
      eval: correctAnswer,
      state: {
        val: userAnswers
      },
      score: questionScore,
      max_score: this._question.config.max_score,
      values: telemetryAnsArr,
      noOfCorrectAns: correctAnswersCount,
      totalAns: this._question.data.answer.length
    };

    var callback = event.target;
    /*istanbul ignore else*/
    if (_.isFunction(callback)) {
      callback(result);
    }

    QSTelemetryLogger.logEvent(QSTelemetryLogger.EVENT_TYPES.RESPONSE, { "type": "INPUT", "values": telemetryAnsArr }); // eslint-disable-line no-undef
  }
});
//# sourceURL=questionunitFtbRendererPlugin.js