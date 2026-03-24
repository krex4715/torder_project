(function () {
  "use strict";

  var PROTOCOL = {
    INBOUND: {
      PLAY: "INT_PLAY",
      CLOSE: "INT_CLOSE"
    },
    OUTBOUND: {
      IMPRESSION: "INT_IMPRESSION",
      ERROR: "INT_ERROR",
      ENDED: "INT_ENDED",
      CLOSE: "INT_CLOSE"
    },
    ERROR_CODE: {
      NO_ADS: "NO_ADS",
      EMPTY_AD: "EMPTY_AD",
      TIMEOUT: "TIMEOUT",
      INTERNAL: "INTERNAL"
    },
    CLOSE_CODE: {
      TOUCH: "TOUCH",
      CLOSE: "CLOSE",
      FORCE_CLOSE: "FORCE_CLOSE"
    }
  };

  var PLAY_TIMEOUT_MS = 120000;

  var state = {
    playRequested: false,
    impressionSent: false,
    terminalSent: false,
    timeoutId: null,
    sessionId: null,
    contentId: "rolling-survey-v1",
    currentQuestion: 0,
    responses: []
  };

  var survey = [
    {
      question_id: "q1",
      text: "이성을 볼 때 가장 중요한 조건은 무엇인가요?",
      answers: [
        { answer_id: "q1_a1", label: "외모" },
        { answer_id: "q1_a2", label: "경제력" },
        { answer_id: "q1_a3", label: "성격" },
        { answer_id: "q1_a4", label: "가치관" }
      ]
    },
    {
      question_id: "q2",
      text: "당신의 커뮤니케이션 스타일은 무엇에 가까운가요?",
      answers: [
        { answer_id: "q2_a1", label: "따뜻하고 차분함" },
        { answer_id: "q2_a2", label: "솔직하고 직설적" },
        { answer_id: "q2_a3", label: "유쾌하고 재치있음" },
        { answer_id: "q2_a4", label: "신중하고 깊이있음" }
      ]
    },
    {
      question_id: "q3",
      text: "소개받고 싶은 이성의 연령대는 어떻게 되나요?",
      answers: [
        { answer_id: "q3_a1", label: "20대" },
        { answer_id: "q3_a2", label: "30대" },
        { answer_id: "q3_a3", label: "40대" },
        { answer_id: "q3_a4", label: "50대 이상" }
      ]
    }
  ];

  var resultCatalog = {
    q1_a1: "외모 중시형 매칭",
    q1_a2: "안정 중시형 매칭",
    q1_a3: "공감 소통형 매칭",
    q1_a4: "가치관 조화형 매칭",
    q2_a1: "따뜻한 대화형",
    q2_a2: "명확한 소통형",
    q2_a3: "유쾌한 분위기형",
    q2_a4: "진중한 공감형",
    q3_a1: "20대 라이프스타일 추천",
    q3_a2: "30대 밸런스 추천",
    q3_a3: "40대 안정 추천",
    q3_a4: "50대 이상 신뢰 추천"
  };

  var els = {};

  function resetState() {
    clearTimeout(state.timeoutId);
    state.playRequested = false;
    state.impressionSent = false;
    state.terminalSent = false;
    state.timeoutId = null;
    state.sessionId = null;
    state.currentQuestion = 0;
    state.responses = [];
  }

  function renderWaitingState() {
    switchView("start");
    els.kickerStart.textContent = "INT_PLAY 대기중";
    els.titleStart.textContent = "설문 광고 준비 완료";
    els.descStart.textContent = "INT_PLAY 수신 후, 아래 버튼을 눌러 설문을 시작하세요.";
    els.startBtn.disabled = true;
  }

  function logMessage(direction, payload) {
    console.log("[INT][" + direction + "]", payload);
  }

  function send(type, body) {
    if (body === void 0) body = {};
    var message = { type: type, body: body };
    logMessage("SEND", message);
    window.parent.postMessage(message, "*");
  }

  function makeSessionId() {
    var seed = Date.now().toString(36);
    var nonce = Math.random().toString(36).slice(2, 10);
    return "sess_" + seed + "_" + nonce;
  }

  function switchView(name) {
    var views = document.querySelectorAll(".view");
    for (var i = 0; i < views.length; i += 1) {
      var isActive = views[i].getAttribute("data-view") === name;
      views[i].classList.toggle("active", isActive);
    }
  }

  function sendError(code, detail) {
    if (state.terminalSent) return;
    state.terminalSent = true;
    state.playRequested = false;
    clearTimeout(state.timeoutId);
    send(PROTOCOL.OUTBOUND.ERROR, {
      code: code,
      message: detail || "Unknown error"
    });
    if (els.titleStart && els.descStart && els.startBtn) {
      switchView("start");
      els.kickerStart.textContent = "오류 종료";
      els.titleStart.textContent = "광고가 오류로 종료되었습니다";
      els.descStart.textContent = "광고 슬롯을 닫고 다음 캠페인으로 이동해주세요.";
      els.startBtn.disabled = true;
    }
  }

  function sendEnded() {
    if (state.terminalSent) return;
    state.terminalSent = true;
    state.playRequested = false;
    clearTimeout(state.timeoutId);
    send(PROTOCOL.OUTBOUND.ENDED);
    if (els.kickerStart && els.titleStart && els.descStart && els.startBtn) {
      switchView("start");
      els.kickerStart.textContent = "완료";
      els.titleStart.textContent = "참여해주셔서 감사합니다";
      els.descStart.textContent = "설문과 리드 정보가 정상 저장되었습니다.";
      els.startBtn.disabled = true;
    }
  }

  function sendClose(code) {
    if (state.terminalSent) return;
    state.terminalSent = true;
    state.playRequested = false;
    clearTimeout(state.timeoutId);
    send(PROTOCOL.OUTBOUND.CLOSE, { code: code });
    if (els.kickerStart && els.titleStart && els.descStart && els.startBtn) {
      switchView("start");
      els.kickerStart.textContent = "종료";
      els.titleStart.textContent = "광고를 종료했습니다";
      els.descStart.textContent = "종료 신호를 부모 송출 모듈에 전달했습니다.";
      els.startBtn.disabled = true;
    }
  }

  function getQuestion(index) {
    return survey[index] || null;
  }

  function saveResponse(question, answer) {
    var record = {
      session_id: state.sessionId,
      question_id: question.question_id,
      answer_id: answer.answer_id,
      timestamp: new Date().toISOString()
    };
    state.responses.push(record);
    console.log("[INT][DATA] survey_response", record);
  }

  function computeResult() {
    var labels = [];
    var i;

    for (i = 0; i < state.responses.length; i += 1) {
      var answerId = state.responses[i].answer_id;
      if (resultCatalog[answerId]) labels.push(resultCatalog[answerId]);
    }

    if (!labels.length) {
      labels.push("균형형 매칭 프로필");
    }

    return {
      title: labels[0],
      body: "선택 결과: " + labels.slice(0, 3).join(" / ")
    };
  }

  function renderQuestion() {
    var question = getQuestion(state.currentQuestion);
    if (!question) {
      sendError(PROTOCOL.ERROR_CODE.EMPTY_AD, "Question data is missing");
      return;
    }

    els.questionStep.textContent = "질문 " + (state.currentQuestion + 1) + " / " + survey.length;
    els.questionTitle.textContent = question.text;
    els.answerList.innerHTML = "";

    for (var i = 0; i < question.answers.length; i += 1) {
      var answer = question.answers[i];
      var button = document.createElement("button");
      button.type = "button";
      button.className = "answer-btn";
      button.textContent = answer.label;
      button.setAttribute("data-answer-id", answer.answer_id);
      button.addEventListener("click", makeAnswerHandler(question, answer));
      els.answerList.appendChild(button);
    }

    switchView("question");
  }

  function makeAnswerHandler(question, answer) {
    return function () {
      if (!state.playRequested || state.terminalSent) return;

      saveResponse(question, answer);
      state.currentQuestion += 1;
      if (state.currentQuestion >= survey.length) {
        var result = computeResult();
        els.resultTitle.textContent = result.title;
        els.resultBody.textContent = result.body;
        switchView("result");
        return;
      }

      renderQuestion();
    };
  }

  function startSurveyFlow() {
    if (!state.playRequested || state.terminalSent) return;
    state.sessionId = makeSessionId();
    state.currentQuestion = 0;
    state.responses = [];
    console.log("[INT][DATA] session_created", {
      session_id: state.sessionId,
      content_id: state.contentId,
      timestamp: new Date().toISOString()
    });
    renderQuestion();
  }

  function submitLead(event) {
    event.preventDefault();
    if (!state.playRequested || state.terminalSent) return;

    var leadData = {
      session_id: state.sessionId,
      name: els.name.value.trim(),
      phone: els.phone.value.trim(),
      age: els.age.value.trim(),
      gender: els.gender.value,
      email: els.email.value.trim(),
      consent: els.consent.checked,
      answers: state.responses.slice(),
      survey_id: state.contentId,
      device_id: "sandbox-device",
      timestamp: new Date().toISOString()
    };

    if (!leadData.name || !leadData.phone || !leadData.age || !leadData.gender || !leadData.email || !leadData.consent) {
      sendError(PROTOCOL.ERROR_CODE.EMPTY_AD, "리드 입력값 검증에 실패했습니다");
      return;
    }

    console.log("[INT][DATA] lead_data", leadData);
    sendEnded();
  }

  function onPlayMessage() {
    if (state.playRequested && !state.terminalSent) return;

    if (state.terminalSent) {
      resetState();
      if (els.leadForm) {
        els.leadForm.reset();
      }
    }

    state.playRequested = true;
    send(PROTOCOL.OUTBOUND.IMPRESSION);
    state.impressionSent = true;
    state.timeoutId = setTimeout(function () {
      sendError(PROTOCOL.ERROR_CODE.TIMEOUT, "Ad timeout exceeded");
    }, PLAY_TIMEOUT_MS);
    switchView("start");
    els.kickerStart.textContent = "광고 진행중 (INT_PLAY 수신)";
    els.titleStart.textContent = "30초 설문을 시작하세요";
    els.descStart.textContent = "설문 시작 버튼을 눌러 질문에 답변해주세요.";
    els.startBtn.disabled = false;
  }

  function bindUi() {
    els.kickerStart = document.querySelector("#view-start .kicker");
    els.titleStart = document.querySelector("#view-start .title");
    els.descStart = document.querySelector("#view-start .desc");
    els.startBtn = document.getElementById("start-btn");
    els.closeBtn = document.getElementById("close-btn");
    els.touchExitBtn = document.getElementById("touch-exit-btn");
    els.questionStep = document.getElementById("question-step");
    els.questionTitle = document.getElementById("question-title");
    els.answerList = document.getElementById("answer-list");
    els.resultTitle = document.getElementById("result-title");
    els.resultBody = document.getElementById("result-body");
    els.leadBtn = document.getElementById("lead-btn");
    els.leadForm = document.getElementById("lead-form");
    els.name = document.getElementById("name");
    els.phone = document.getElementById("phone");
    els.age = document.getElementById("age");
    els.gender = document.getElementById("gender");
    els.email = document.getElementById("email");
    els.consent = document.getElementById("consent");

    if (!els.startBtn || !els.closeBtn || !els.touchExitBtn || !els.leadForm || !els.answerList) {
      sendError(PROTOCOL.ERROR_CODE.EMPTY_AD, "Required UI element missing");
      return;
    }

    els.startBtn.disabled = true;
    els.startBtn.addEventListener("click", startSurveyFlow);
    els.closeBtn.addEventListener("click", function () {
      sendClose(PROTOCOL.CLOSE_CODE.CLOSE);
    });
    els.touchExitBtn.addEventListener("click", function () {
      if (!state.playRequested || state.terminalSent) return;
      sendClose(PROTOCOL.CLOSE_CODE.TOUCH);
    });
    els.leadBtn.addEventListener("click", function () {
      switchView("lead");
    });
    els.leadForm.addEventListener("submit", submitLead);
  }

  function onMessage(event) {
    var msg = event.data || {};
    if (typeof msg === "string") {
      try {
        msg = JSON.parse(msg);
      } catch (_err) {
        msg = { type: msg };
      }
    }
    logMessage("RECV", msg);

    if (msg.type === PROTOCOL.INBOUND.PLAY) {
      onPlayMessage();
    }

    if (msg.type === PROTOCOL.INBOUND.CLOSE) {
      send(PROTOCOL.OUTBOUND.CLOSE, { code: PROTOCOL.CLOSE_CODE.FORCE_CLOSE });
      state.terminalSent = true;
      clearTimeout(state.timeoutId);
      if (els.kickerStart && els.titleStart && els.descStart && els.startBtn) {
        switchView("start");
        els.kickerStart.textContent = "강제 종료";
        els.titleStart.textContent = "부모 요청으로 광고가 종료되었습니다";
        els.descStart.textContent = "내부 정리 후 강제 종료 응답을 전송했습니다.";
        els.startBtn.disabled = true;
      }
    }
  }

  function init() {
    bindUi();
    window.addEventListener("message", onMessage);
    window.addEventListener("error", function (event) {
      sendError(PROTOCOL.ERROR_CODE.INTERNAL, event.message || "Runtime error");
    });
    window.addEventListener("unhandledrejection", function (event) {
      var reason = event.reason;
      var text = typeof reason === "string" ? reason : (reason && reason.message) || "Unhandled promise rejection";
      sendError(PROTOCOL.ERROR_CODE.INTERNAL, text);
    });
    resetState();
    renderWaitingState();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
