const NodeHelper = require("node_helper")

module.exports = NodeHelper.create({

  async socketNotificationReceived(notification, payload) {
    const self = this

    if (notification === "GET_QUIZ_QUESTIONS") {
      let url = `https://the-trivia-api.com/v2/questions?limit=${payload.limit || 1}`
      if (payload.difficulties)
        url += `&difficulties=${payload.difficulties}`
      if (payload.tags)
        url += `&tags=${payload.tags}`

      try {
        const response = await fetch(url)
        const body = await response.json()
        self.sendSocketNotification("QUIZ_QUESTIONS", body)
      } catch (error) {
        self.sendSocketNotification("QUIZ_QUESTIONS_FAILED", error)
      }
    }
  },
})
