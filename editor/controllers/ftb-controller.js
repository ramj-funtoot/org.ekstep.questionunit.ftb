/*
 * Plugin to create MCQ question
 * @class org.ekstep.questionunitmcq:mcqQuestionFormController
 * Jagadish P<jagadish.pujari@tarento.com>
 */
angular.module('ftbApp', ['org.ekstep.question', 'jsTag']).controller('ftbQuestionFormController', ['$scope', '$rootScope', 'questionServices', 'JSTagsCollection', '$timeout', function ($scope, $rootScope, questionServices, JSTagsCollection, $timeout) { // eslint-disable-line no-unused-vars
  var questionInput;
  $scope.keyboardConfig = {
    keyboardType: 'Device',
    customKeys: []
  };
  $scope.configuration = {
    'questionConfig': {
      'isText': true,
      'isImage': true,
      'isAudio': true,
      'isHint': false
    }
  };
  $scope.questionMedia = {};
  $scope.keyboardTypes = ['Device', 'English', 'Custom'];
  $scope.ftbFormData = {
    question: {
      text: '',
      image: '',
      audio: '',
      audioName: '',
      keyboardConfig: $scope.keyboardConfig
    },
    answer: [],
    media: []
  };
  $scope.config = {
    auto_migrate: true
  }
  questionInput = CKEDITOR.replace('ftbQuestion', { // eslint-disable-line no-undef
    extraPlugins: 'notification,font,justify,colorbutton,mathtext,wordcount,pastefromword,clipboard,ftbblank',
    extraAllowedContent: 'div span',
    customConfig: ecEditor.resolvePluginResource('org.ekstep.questionunit', '1.0', "editor/ckeditor-config.js"),
    skin: 'moono-lisa,' + CKEDITOR.basePath + "skins/moono-lisa/", // eslint-disable-line no-undef
    contentsCss: CKEDITOR.basePath + "contents.css" // eslint-disable-line no-undef
  });
  questionInput.on('change', function () {
    $scope.ftbFormData.question.text = this.getData();
    if ($scope.config.auto_migrate && isMigrationNeeded($scope.ftbFormData.question.text)) {
      $timeout(function () {
        $scope.ftbFormData.question.text = migrateQuestion($scope.ftbFormData.question.text);
        questionInput.setData($scope.ftbFormData.question.text);
        $scope.$safeApply();
      }, 1000);
    }
    $scope.$safeApply();
  });
  questionInput.on('focus', function () {
    $scope.generateTelemetry({
      type: 'TOUCH',
      id: 'input',
      target: {
        id: 'questionunit-ftb-question',
        ver: '',
        type: 'input'
      }
    })
  });
  $scope.init = function () {
    /**
     * editor:questionunit.ftb:call form validation.
     * @event org.ekstep.questionunit.ftb:validateform
     * @memberof org.ekstep.questionunit.ftb.horizontal_controller
     */
    EventBus.listeners['org.ekstep.questionunit.ftb:validateform'] = [];
    $scope.ftbPluginInstance = org.ekstep.pluginframework.pluginManager.getPluginManifest("org.ekstep.questionunit.ftb");
    ecEditor.addEventListener('org.ekstep.questionunit.ftb:validateform', function (event, callback) {
      var validationRes = $scope.formValidation();
      callback(validationRes.isValid, validationRes.formData);
    }, $scope);
    /**
     * editor:questionunit.ftb:call form edit the question.
     * @event org.ekstep.questionunit.ftb:editquestion
     * @memberof org.ekstep.questionunit.ftb.horizontal_controller
     */
    EventBus.listeners['org.ekstep.questionunit.ftb:editquestion'] = [];
    ecEditor.addEventListener('org.ekstep.questionunit.ftb:editquestion', $scope.editFtbQuestion, $scope);
    //its indicating the controller is loaded in question unit
    ecEditor.dispatchEvent("org.ekstep.questionunit:ready");
  }
  /**
   * add media to stage
   * @memberof org.ekstep.questionunit.ftb.horizontal_controller
   */
  $scope.addAllMedia = function () {
    var addAllMedia;
    $scope.keyboardPluginInstance = org.ekstep.pluginframework.pluginManager.getPluginManifest("org.ekstep.keyboard");
    addAllMedia = [{
      id: "org.ekstep.keyboard.eras_icon",
      src: ecEditor.resolvePluginResource($scope.keyboardPluginInstance.id, $scope.keyboardPluginInstance.ver, 'renderer/assets/eras_icon.png'),
      assetId: "org.ekstep.keyboard.eras_icon",
      type: "image",
      preload: true
    }, {
      id: "org.ekstep.keyboard.language_icon",
      src: ecEditor.resolvePluginResource($scope.keyboardPluginInstance.id, $scope.keyboardPluginInstance.ver, 'renderer/assets/language_icon.png'),
      assetId: "org.ekstep.keyboard.language_icon",
      type: "image",
      preload: true
    }, {
      id: "org.ekstep.keyboard.hide_keyboard",
      src: ecEditor.resolvePluginResource($scope.keyboardPluginInstance.id, $scope.keyboardPluginInstance.ver, 'renderer/assets/keyboard.svg'),
      assetId: "org.ekstep.keyboard.hide_keyboard",
      type: "image",
      preload: true
    }];
    //push media into ftbform media
    addAllMedia.forEach(function (obj) {
      $scope.ftbFormData.media.push(obj);
    })
  }

  var isMigrationNeeded = function (question) {
    return (/\[\[.*?\]\]/g.test(question));
  }

  var migrateQuestion = function (question) {
    if (/\[\[.*?\]\]/g.test(question)) {
      $scope.ftbFormData.data = $scope.ftbFormData.data || {};
      $scope.ftbFormData.data.blanks = $scope.ftbFormData.data.blanks || {};
      $scope.blankAnswers = $scope.blankAnswers || {};
      var index = _.max(_.map(getFtbBlanks(question), function (b, i) {
        return parseInt(b.innerText || b.textContent);
      })) || 0;
      // replace one by one (by not specifying /g option in the regex)
      while (/\[\[.*?\]\]/g.test(question)) {
        question = question.replace(/\[\[(.*?)\]\]/, function (a, b) { // eslint-disable-line no-unused-vars
          var id = "b" + index;
          $scope.ftbFormData.data.blanks[id] = $scope.ftbFormData.data.blanks[id] || {
            "id": id,
            "seq": "" + (index + 1),
            answers: [b]
          }
          $scope.blankAnswers[id] = $scope.blankAnswers[id] || angular.extend({}, {
            "tags": new JSTagsCollection([b])
          }, $scope.jsTagOptions);
          return '<span class="ftb-blank" contenteditable="false" id="' + id + '">' + (index + 1) + '</span>'
        });
        index++;
      }
    }
    return question;
  }
  /**
   * for edit flow
   * @memberof org.ekstep.questionunit.ftb.horizontal_controller
   * @param {event} event data.
   * @param {question} data data.
   */
  $scope.editFtbQuestion = function (event, data) {
    var qdata = data.data;
    $scope.ftbFormData.question = qdata.question;
    $scope.keyboardConfig = qdata.question.keyboardConfig;
    _.each(qdata.media, function (mediaObject, index) {
      $scope.questionMedia[mediaObject.type] = mediaObject;
    });
    $scope.ftbFormData.question.text = migrateQuestion($scope.ftbFormData.question.text);
    $scope.$safeApply();
  }
  /**
   * create answer array for ftb blank
   * @memberof org.ekstep.questionunit.ftb.horizontal_controller
   */
  $scope.createAnswerArray = function () {
    var regexForAns = /(?:^|)\[\[(.*?)(?:\]\]|$)/g;
    $scope.ftbFormData.answer = $scope.splitAnswer($scope.ftbFormData.question.text, regexForAns, 1).map(function (a) {
      a = $scope.extractHTML(a);
      return a.toLowerCase().trim();
    });
    if ($scope.ftbFormData.data && $scope.ftbFormData.data.blanks) {
      _.each($scope.ftbFormData.data.blanks, function (blank, k) {
        if (!blank.group)
          blank.answers = _.map($scope.blankAnswers[k].tags.tags, function (t) {
            return t.value;
          });
      });
    }
    if ($scope.ftbFormData.data && $scope.ftbFormData.data.groups) {
      _.each($scope.ftbFormData.data.groups, function (group, k) {
        group.answers = _.map($scope.groupAnswers[k], function (a) {
          return _.map(a.tags.tags, function (t) {
            return t.value;
          });
        });
      });
    }
  }

  $scope.extractHTML = function (htmlElement) {
    var divElement = document.createElement('div');
    divElement.innerHTML = htmlElement;
    return divElement.textContent || divElement.innerText;
  }
  /**
   * split answer into question text
   * @memberof org.ekstep.questionunit.ftb.horizontal_controller
   * @returns {String} question data.
   * @param {string} string data.
   * @param {regex} regex expression.
   * @param {index} index value.
   */
  $scope.splitAnswer = function (string, regex, index) {
    var matches = [],
      match;
    while (match = regex.exec(string)) { // eslint-disable-line no-cond-assign
      matches.push(match[index]);
    }
    return matches;
  }
  /**
   * check form validation
   * @memberof org.ekstep.questionunit.ftb.horizontal_controller
   * @returns {Object} question data.
   */
  $scope.formValidation = function () {
    var ftbFormQuestionText, formValid, formConfig = {};
    $scope.submitted = true;
    ftbFormQuestionText = $scope.ftbFormData.question.text;
    formValid = (ftbFormQuestionText.length > 0)
      && (/\[\[.*?\]\]/g.test(ftbFormQuestionText) || getFtbBlanks(ftbFormQuestionText).length > 0);

    $scope.ftbFormData.media = [];
    $scope.addAllMedia();
    _.isEmpty($scope.ftbFormData.question.image) ? 0 : $scope.ftbFormData.media.push($scope.questionMedia.image);
    _.isEmpty($scope.ftbFormData.question.audio) ? 0 : $scope.ftbFormData.media.push($scope.questionMedia.audio);

    if (formValid) {
      $scope.createAnswerArray();
      formConfig.isValid = true;
      formConfig.formData = $scope.ftbFormData;
      $('.questionTextBox').removeClass("ck-error");
    } else {
      formConfig.isValid = false;
      formConfig.formData = $scope.ftbFormData;
      $('.questionTextBox').addClass("ck-error");
    }
    return formConfig;
  }

  /**
   * Helper function to generate telemetry event
   * @param {Object} data telemetry data
   */
  $scope.generateTelemetry = function (data) {
    if (data) {
      data.plugin = data.plugin || {
        "id": $scope.ftbPluginInstance.id,
        "ver": $scope.ftbPluginInstance.ver
      }
      data.form = data.form || 'question-creation-ftb-form';
      questionServices.generateTelemetry(data);
    }
  }

  /**
   * invokes the asset browser to pick an image to add to either the question or the options
   * @param {string} id if `q` then it is image for question, else for options
   * @param {string} type if `id` is not `q` but an index, then it can be either 'LHS' or 'RHS'
   * @param {string} mediaType `image` or `audio`
   */
  $scope.addMedia = function (type, index, mediaType) {
    var mediaObject = {
      type: mediaType,
      search_filter: {} // All composite keys except mediaType
    }
    //Defining the callback function of mediaObject before invoking asset browser
    mediaObject.callback = function (data) {
      var telemetryObject = { type: 'TOUCH', id: 'button', target: { id: 'questionunit-ftb-add-' + mediaType, ver: '', type: 'button' } };
      var media = {
        "id": Math.floor(Math.random() * 1000000000), // Unique identifier
        "src": org.ekstep.contenteditor.mediaManager.getMediaOriginURL(data.assetMedia.src), // Media URL
        "assetId": data.assetMedia.id, // Asset identifier
        "type": data.assetMedia.type, // Type of asset (image, audio, etc)
        "preload": false // true or false
      };

      $scope.ftbFormData.question[mediaType] = org.ekstep.contenteditor.mediaManager.getMediaOriginURL(data.assetMedia.src);
      data.assetMedia.type == 'audio' ? $scope.ftbFormData.question.audioName = data.assetMedia.name : '';
      $scope.questionMedia[mediaType] = media;
      if (!$scope.$$phase) {
        $scope.$digest()
      }
      $scope.generateTelemetry(telemetryObject)
    }
    questionServices.invokeAssetBrowser(mediaObject);
  }

  /**
   * Deletes the selected media
   * @param {string} type 
   * @param {Integer} index 
   * @param {string} mediaType 
   */
  $scope.deleteMedia = function (type, index, mediaType) {
    var telemetryObject = { type: 'TOUCH', id: 'button', target: { id: 'questionunit-ftb-delete-' + mediaType, ver: '', type: 'button' } };
    $scope.ftbFormData.question[mediaType] = '';
    delete $scope.questionMedia.image;
    $scope.generateTelemetry(telemetryObject)
  }

  /**
   * Callbacks object to be passed to the directive to manage selected media
   */
  $scope.callbacks = {
    deleteMedia: $scope.deleteMedia,
    addMedia: $scope.addMedia,
    qtype: 'ftb'
  }

  var getFtbBlanks = function (html) {
    var e = $('<div></div>');
    e.html(html);
    return $('.ftb-blank', e);
  }

  $scope.$watch('ftbFormData.question.text', function (n, o) {
    if (n != undefined) {
      var blanks = getFtbBlanks(n);
      if (blanks.length > 0) {
        $scope.ftbFormData.data = $scope.ftbFormData.data || {};
        $scope.ftbFormData.data.blanks = $scope.ftbFormData.data.blanks || {};
        $scope.blankAnswers = $scope.blankAnswers || {};
        _.each(blanks, function (b, i) {
          // check and initialize blank obj
          $scope.ftbFormData.data.blanks[b.id] = $scope.ftbFormData.data.blanks[b.id] || {
            "id": b.id,
            "seq": (b.textContent || b.innerText).trim(),
            answers: []
          }
          // if the blank is already part of the group, don't create the JStagcollection
          if (!$scope.ftbFormData.data.blanks[b.id].group) {
            $scope.blankAnswers[b.id] = $scope.blankAnswers[b.id] || angular.extend({}, {
              "tags": new JSTagsCollection([])
            }, $scope.jsTagOptions)
          }
        });
      }
      // if there are any objects that are extra, then remove them
      if ($scope.ftbFormData.data && $scope.ftbFormData.data.blanks) {
        var missingBlanks = [];
        _.each($scope.ftbFormData.data.blanks, function (b, k) {
          var blankElt = _.find(blanks, function (bElt) {
            return bElt.id == k;
          });
          if (!blankElt)
            missingBlanks.push(k);
        })
        _.each(missingBlanks, function (mb, i) {
          delete $scope.ftbFormData.data.blanks[mb];
          if ($scope.blankAnswers[mb])
            delete $scope.blankAnswers[mb];
        });
      }
    }
  });
  $scope.jsTagOptions = {
    "texts": {
      "inputPlaceHolder": "Type answer here"
    }
  };

  var ungroupBlanks = function (grpId) {
    // obtain all the blanks that are part of this group
    var grpBlanks = $scope.getBlanksInGroup(grpId);
    var gIndex = 0;
    $scope.blankAnswers = $scope.blankAnswers || {};
    _.each(grpBlanks, function (blank, id) {
      var answers = _.map($scope.groupAnswers[grpId][gIndex].tags.tags, function (t) {
        return t.value;
      });
      $scope.blankAnswers[id] = $scope.blankAnswers[id] || angular.extend({}, {
        "tags": new JSTagsCollection(answers)
      }, $scope.jsTagOptions);
      $scope.ftbFormData.data.blanks[id].answers = [];
      delete $scope.ftbFormData.data.blanks[id].group;
      gIndex++;
    });
  }

  var getNewGroupId = function () {
    return "" + ($scope.getGroupsCount() + 1);
  }

  var groupBlanks = function (blankIds, grpId) {
    grpId = grpId || getNewGroupId();
    $scope.ftbFormData.data.groups = $scope.ftbFormData.data.groups || {};
    $scope.ftbFormData.data.groups[grpId] = { answers: [] }
    $scope.groupAnswers = $scope.groupAnswers || {};
    $scope.groupAnswers[grpId] = [];
    $scope.groupAnswers[grpId] = _.map(blankIds, function (bId) {
      var answers = _.map($scope.blankAnswers[bId].tags.tags, function (t) {
        return t.value;
      });
      return angular.extend({}, {
        "tags": new JSTagsCollection(answers)
      }, $scope.jsTagOptions);
    })
    _.each(blankIds, function (bId) {
      $scope.ftbFormData.data.blanks[bId].group = grpId;
      delete $scope.ftbFormData.data.blanks[bId].answers;
      delete $scope.blankAnswers[bId];
    });
  }

  $scope.toggleGroupAll = function () {
    if ($scope.ftbFormData.data.groups && Object.keys($scope.ftbFormData.data.groups).length > 0) {
      // ungroup - restore the answers from the group to the blanks
      _.each($scope.ftbFormData.data.groups, function (grp, key) {
        ungroupBlanks(key);
      })
      delete $scope.ftbFormData.data.groups;
    }
    else {
      // form group - right now only one group is supported, that has all the blanks.
      groupBlanks(Object.keys($scope.ftbFormData.data.blanks));
      delete $scope.blankAnswers;
    }
  }

  $scope.allowGroups = function () {
    return ($scope.ftbFormData.data.blanks && Object.keys($scope.ftbFormData.data.blanks).length > 1);
  }

  $scope.getBlanksCount = function () {
    if ($scope.ftbFormData.data && $scope.ftbFormData.data.blanks)
      return Object.keys($scope.ftbFormData.data.blanks).length;
    return 0;
  }

  $scope.getGroupsCount = function () {
    if ($scope.ftbFormData.data && $scope.ftbFormData.data.groups)
      return Object.keys($scope.ftbFormData.data.groups).length;
    return 0;
  }

  $scope.getUngroupedBlanks = function () {
    var ungrouped = {};
    _.each($scope.ftbFormData.data.blanks, function (blank, key) {
      if (!blank.group)
        ungrouped[key] = blank;
    });
    return ungrouped;
  }

  $scope.getBlanksInGroup = function (grpId) {
    var grpBlanks = {};
    _.each($scope.ftbFormData.data.blanks, function (blank, key) {
      if (blank.group == grpId)
        grpBlanks[key] = blank;
    });
    return grpBlanks;
  }

  $scope.addAnswerToGroup = function (grpId) {
    $scope.groupAnswers[grpId].push(angular.extend({}, {
      "tags": new JSTagsCollection([])
    }, $scope.jsTagOptions));
  }
}]);
//# sourceURL=horizontalFTB.js