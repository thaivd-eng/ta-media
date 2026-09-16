import * as data from "~/utils/data-service";
import { getVideoObjectUrl } from "~/utils/video-storage";

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
      data.removeFeedback({ id });
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
      let videos = [];
      try {
        videos = await data.find("videos");
      } catch (e) {
        videos = [];
      }
      const localVideos = data.getLocalVideos();
      this.video = localVideos.find((v) => String(v.id) === String(videoId)) || (videos || []).find((v) => String(v.id) === String(videoId));

      let versions = [];
      try {
        versions = await data.find("versions");
      } catch (e) {
        versions = [];
      }
      this.versions = (versions || []).filter((v) => String(v.videoId) === String(videoId));

      // Check IndexedDB local stored file
      const localBlobUrl = await getVideoObjectUrl(videoId);
      if (localBlobUrl) {
        if (!this.video) this.video = { id: videoId, name: 'Video dự thi' };
        this.video.videoUrl = localBlobUrl;
        if (this.versions.length === 0) {
          this.versions = [{ id: videoId, videoId, videoUrl: localBlobUrl, name: 'v1' }];
        } else {
          this.versions[this.versions.length - 1].videoUrl = localBlobUrl;
        }
      } else if (this.versions.length === 0 && this.video?.videoUrl) {
        this.versions = [{ id: this.video.id, videoId: this.video.id, videoUrl: this.video.videoUrl, name: 'v1' }];
      } else if (this.versions.length === 0 && this.video?.versions?.length > 0) {
        this.versions = [...this.video.versions];
      }

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
      let rawUser = useCookie("user").value;
      let userName = 'admin';
      if (rawUser) {
        if (typeof rawUser === 'string') {
          try { userName = JSON.parse(rawUser).userName || 'admin'; } catch {}
        } else {
          userName = rawUser.userName || 'admin';
        }
      }
      let versionId = this.currentVersion.id;
      let timeFormated = new Date(0,0,0,0,0,time).toString().slice(16,24);

      this.feedbacks.push({
        id,
        time,
        content,
        versionId,
        timeFormated,
        createdBy: userName,
        createdAt: new Date().toLocaleString("en-GB"),
      });

      await data.createFeedback({
        id,
        time,
        content,
        versionId,
        createdBy: userName,
      });
    }
  },
});
