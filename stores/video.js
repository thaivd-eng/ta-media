import * as data from "~/utils/data-service";

export const useVideoStore = defineStore("video", {
  state: () => ({
    video: null,
    versions: [],
    feedbacks: [],
    currentVersion: null,
  }),
  actions: {
    setVideo(video) {
      this.video = video;
    },
    setVersions(versions) {
      this.versions = versions;
    },
    setFeedbacks(feedbacks) {
      this.feedbacks = feedbacks;
    },
    setCurrentVersion(version) {
      this.currentVersion = version;
      this.findFeedbacks();
    },

    removeVersion(id) {
      let index = this.versions.findIndex((v) => v.id == id);
      this.versions.splice(index, 1);
      this.currentVersion = this.versions[this.versions.length - 1];
      data.removeVersion({ id });
    },

    removeFeedback(id) {
      let index = this.feedbacks.findIndex((f) => f.id == id);
      this.feedbacks.splice(index, 1);
      data.remove("feedbacks", { id });
    },

    async reset() {
      this.video = null;
      this.versions = [];
      this.feedbacks = [];
      this.currentVersion = null;
    },

    async fetchData() {
      this.reset();

      let videoId = useRoute().query.id;
      let videos = await data.find("videos");
      this.video = videos.find((v) => v.id == videoId);

      let versions = await data.find("versions");
      this.versions = versions.filter((v) => v.videoId == videoId);

      if (this.versions.length > 0) {
        this.currentVersion = this.versions[this.versions.length - 1];
      }

      if (!this.currentVersion) {
        this.feedbacks = [];
        return;
      }

      let versionId = this.currentVersion.id;
      this.findFeedbacks();
    },

    async findFeedbacks() {
      let versionId = this.currentVersion.id;
      let feedbacks = await data.find("feedbacks");
      this.feedbacks = feedbacks.filter((f) => f.versionId == versionId);
    },

    async createFeedback({ id, time, content }) { 
      let user = useCookie("user").value;
      let versionId = this.currentVersion.id;
      let timeFormated = new Date(0,0,0,0,0,time).toString().slice(16,24);

      this.feedbacks.push({
        id,
        time,
        content,
        versionId,
        timeFormated,
        createdBy: user.userName,
        createdAt: new Date().toLocaleString("en-GB"),
      });

      await data.create("feedbacks", {
        id,
        time,
        content,
        versionId,
        createdBy: user.userName,
      });
    }
  },
});
