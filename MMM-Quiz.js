Module.register("MMM-Quiz", {

  defaults: {
    // Possible values: integer or percentage.
    // Example: '200px' or '40%'
    maxWidth: "",
    // Possible values: left, center, right
    align: "center",
    // Possible values: easy, medium, hard.
    // Comma separated list of difficulties of questions to return. If not provided, all difficulties will be used.
    // Example: 'easy' or 'easy,medium'
    difficulties: "",
    // Possible values: music, sport_and_leisure, film_and_tv, arts_and_literature, history, society_and_culture, science, geography, food_and_drink, general_knowledge.
    // Comma separated list of tags to return questions from. If not provided, all tags will be used.
    // Example: 'science' or 'science,music'
    tags: "",
  },

  /**
   * Apply the default quiz styles.
   */
  getStyles() {
    return ["quiz.css"]
  },

  /**
   * Pseudo-constructor for our module. Sets the default current page to 0.
   */
  start() {
    this.questionLimit = 50 // more questions means less calls = more better, minimum = 1, maximum = 50
    this.currentQuestionIndex = 0
    this.userAnswers = new Array(4).fill(false)
    this.questions = undefined
    this.timeoutForNextQuestion = 4000 // this should be a great timeout to see that you correctly answered the question
    this.getNextQuestionSet()
  },

  socketNotificationReceived: function (notification, payload) {
    console.log("Socket notification received", notification)
    if (notification === "QUIZ_QUESTIONS") {
      Log.log(`[${this.name}] received new set questions`, payload)
      this.clearError()
      this.processQuestions(payload)
    } else if (notification === "QUIZ_QUESTIONS_FAILED") {
      Log.error(`[${this.name}] Receiving quiz questions failed`, payload)
      this.setError("Could not retrieve quiz data")
    }
  },

  /**
   * Render the cicles for each page, and highlighting the page we're on.
   */
  getDom() {
    if (this.error)
      return this.getDomError(this.error)

    if (this.questions)
      return this.getDomQuestion()

    return this.getDomLoadingQuestions()
  },

  getDomError(error) {
    Log.log("Render dom error")
    const wrapper = document.createElement("div")
    wrapper.className = "error-container"
    wrapper.innerHTML = error
    return wrapper
  },

  getDomLoadingQuestions() {
    Log.log("Render loading the questions")
    const wrapper = document.createElement("div")
    wrapper.innerHTML = "Loading new questions...."
    return wrapper
  },

  getDomQuestion() {
    const self = this

    const wrapper = document.createElement("div")

    if (this.config.maxWidth)
      wrapper.style.maxWidth = this.config.maxWidth

    const questionElement = document.createElement("div")
    questionElement.className = "question"
    questionElement.innerHTML = this.currentQuestion.question
    questionElement.style.textAlign = this.config.align
    wrapper.appendChild(questionElement)

    const answersWrapper = document.createElement("div")
    answersWrapper.className = "answers"
    answersWrapper.style.justifyContent = this.config.align

    let answerId = "A"
    for (let index = 0; index < this.currentQuestion.answers.length; index++) {
      const element = this.currentQuestion.answers[index]
      const hasBeenAnswered = this.userAnswers[index]

      const answerWrapper = document.createElement("div")
      answerWrapper.classList.add("answer")
      if (hasBeenAnswered) {
        if (element.correct)
          answerWrapper.classList.add("correct")
        else
          answerWrapper.classList.add("incorrect")
      }
      answerWrapper.setAttribute("data-id", index)
      answerWrapper.setAttribute("data-is-correct-answer", element.correct)
      answerWrapper.addEventListener("click", () => { self.processAnswer({ index: index }) })

      const answerIdElement = document.createElement("div")
      answerIdElement.className = "answer-id"
      answerIdElement.innerHTML = answerId
      answerWrapper.appendChild(answerIdElement)

      const answerTextElement = document.createElement("div")
      answerTextElement.className = "answer-text"
      answerTextElement.innerHTML = element.text
      answerWrapper.appendChild(answerTextElement)

      answersWrapper.appendChild(answerWrapper)

      answerId = String.fromCharCode(answerId.charCodeAt(0) + 1)
    }

    wrapper.appendChild(answersWrapper)

    return wrapper
  },

  getNextQuestionSet() {
    Log.log(`[${this.name}] get next question set`, this)
    this.sendSocketNotification("GET_QUIZ_QUESTIONS", {
      limit: this.questionLimit,
      difficulties: this.config.difficulties,
      tags: this.config.tags
    })
  },
  setError(error) {
    this.error = error
    this.updateDom()
  },

  clearError() {
    this.error = undefined
  },

  processQuestions(questions) {
    this.questions = questions
    this.processQuestion(0)
  },

  processQuestion(questionIndex) {
    // We retrieve a [limit] amount of questions and loop through them
    // if all the questions have been played then we should retrieve more questions
    if (questionIndex >= this.questionLimit) {
      this.getNextQuestionSet()
      return
    }

    this.currentQuestionIndex = questionIndex
    this.userAnswers = new Array(4).fill(false)

    // construct all data
    const currentQuestion = this.questions[this.currentQuestionIndex]
    const question = currentQuestion.question.text

    // construct the answers and shuffle them randomly, we don't always want answer A as correct answer
    let answers = []
    answers.push({ correct: true, text: currentQuestion.correctAnswer })
    currentQuestion.incorrectAnswers.forEach(x => answers.push({ correct: false, text: x }))
    this.shuffleArray(answers)

    this.currentQuestion = {
      index: questionIndex,
      question: question,
      answers: answers
    }
    this.updateDom()
  },

  processAnswer(answer) {
    const self = this
    this.userAnswers[answer.index] = true

    if (this.currentQuestion.answers[answer.index].correct) {
      // wait for [timeout] and then go to the next question
      setTimeout(() => self.processQuestion(this.currentQuestion.index + 1), self.timeoutForNextQuestion)
    }

    this.updateDom()
  },

  /**
   * If we recieve a notification that we can respond to, update which page
   * we're suppose to show as active.
   * @param {string} notification The notification ID
   * @param {number} payload the payload type.
   */
  notificationReceived(notification, payload) {
    if (notification === "QUIZ_ANSWER") {
      this.processAnswer({ index: payload })
    }
  },

  /**
   * Shuffle an array randomly
   */
  shuffleArray(array) {
    if (array.length < 2)
      return

    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = array[i]
      array[i] = array[j]
      array[j] = temp
    }
  },
})
