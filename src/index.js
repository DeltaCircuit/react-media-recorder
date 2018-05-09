import React from "react";
import PropTypes from "prop-types";

export default class ReactMediaRecorder extends React.Component {
  state = {
    status: "idle"
  };
  chunks = [];

  static propTypes = {
    audio: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
    video: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
    render: PropTypes.func.isRequired,
    blobPropertyBag: PropTypes.object
  };

  static defaultProps = {
    audio: true
  };

  constructor(props) {
    super(props);
    if (!window.MediaRecorder) {
      throw new Error("React Media Recorder: Unsupported browser");
    }
    const {
      audio,
      video,
      blobPropertyBag = video ? { type: "video/mp4" } : { type: "audio/wav" }
    } = props;
    this.requiredMedia = {
      audio: typeof audio === "boolean" ? !!audio : audio,
      video: typeof video === "boolean" ? !!video : video
    };
    this.blobPropertyBag = blobPropertyBag;
  }

  componentDidMount = async () => {
    this.stream = await this.getMediaStream();
    if (!this.stream) {
      this.setState({ status: "permission_denied" });
    }
  };

  getMediaStream = async () => {
    try {
      const stream = await window.navigator.mediaDevices.getUserMedia(
        this.requiredMedia
      );
      return stream;
    } catch (error) {
      return false;
    }
  };

  onRecordingStop = () => {
    const blob = new Blob(this.chunks, this.blobPropertyBag);
    const url = URL.createObjectURL(blob);
    this.setState({ mediaBlob: url });
  };

  onRecordingActive = ({ data }) => {
    this.chunks.push(data);
  };

  initMediaRecorder = stream => {
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = this.onRecordingActive;
    mediaRecorder.onstop = this.onRecordingStop;
    mediaRecorder.onerror = () => this.setState({ status: "recorder_error" });
    return mediaRecorder;
  };

  startRecording = async () => {
    if (!this.stream || (this.stream && !this.stream.active)) {
      const stream = await this.getMediaStream();
      if (stream) {
        this.stream = stream;
      } else {
        this.setState({ status: "permission_denied" });
        return;
      }
    }
    this.mediaRecorder = this.initMediaRecorder(this.stream);
    this.chunks = [];
    this.setState({ mediaBlob: null });
    this.mediaRecorder.start();
    this.setState({ status: "recording" });
  };

  stopRecording = () => {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
      this.setState({ status: "stopped" });
    }
  };

  render = () =>
    this.props.render({
      status: this.state.status,
      startRecording: this.startRecording,
      stopRecording: this.stopRecording,
      mediaBlob: this.state.mediaBlob
    });
}
