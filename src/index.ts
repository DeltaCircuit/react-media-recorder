import { ReactElement, useCallback, useEffect, useRef, useState } from "react";

type ReactMediaRecorderRenderProps = {
  error: string;
  muteAudio: () => void;
  unMuteAudio: () => void;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  mediaBlobUrl: null | string;
  status: StatusMessages;
  isAudioMuted: boolean;
};

type ReactMediaRecorderProps = {
  render: (props: ReactMediaRecorderRenderProps) => ReactElement;
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
  screen?: boolean;
  onStop?: (blobUrl: string) => void;
  blobPropertyBag?: BlobPropertyBag;
  mediaRecorderOptions?: MediaRecorderOptions | null;
};

type StatusMessages =
  | "media_aborted"
  | "permission_denied"
  | "no_specified_media_found"
  | "media_in_use"
  | "invalid_media_constraints"
  | "no_constraints"
  | "recorder_error"
  | "idle"
  | "acquiring_media"
  | "delayed_start"
  | "recording"
  | "stopping"
  | "stopped";

enum RecorderErrors {
  AbortError = "media_aborted",
  NotAllowedError = "permission_denied",
  NotFoundError = "no_specified_media_found",
  NotReadableError = "media_in_use",
  OverconstrainedError = "invalid_media_constraints",
  TypeError = "no_constraints",
  NONE = "",
  NO_RECORDER = "recorder_error"
}

export const ReactMediaRecorder = ({
  render,
  audio = true,
  video = false,
  onStop = () => null,
  blobPropertyBag,
  screen = false,
  mediaRecorderOptions = null
}: ReactMediaRecorderProps) => {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mediaChunks = useRef<Blob[]>([]);
  const mediaStream = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<StatusMessages>("idle");
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<keyof typeof RecorderErrors>("NONE");

  const getMediaStream = useCallback(async () => {
    const requiredMedia: MediaStreamConstraints = {
      audio: typeof audio === "boolean" ? !!audio : audio,
      video: typeof video === "boolean" ? !!video : video
    };

    if (screen) {
      //@ts-ignore
      const stream = (await window.navigator.mediaDevices.getDisplayMedia({
        video
      })) as MediaStream;
      if (audio) {
        const audioStream = await window.navigator.mediaDevices.getUserMedia({
          audio
        });

        audioStream
          .getAudioTracks()
          .forEach(audioTrack => stream.addTrack(audioTrack));
      }
      return stream;
    }

    const stream = await window.navigator.mediaDevices.getUserMedia(
      requiredMedia
    );

    return stream;
  }, [audio, video, screen]);

  useEffect(() => {
    if (!window.MediaRecorder) {
      throw new Error("Unsupported Browser");
    }

    if (screen) {
      //@ts-ignore
      if (!window.navigator.mediaDevices.getDisplayMedia) {
        throw new Error("This browser doesn't support screen capturing");
      }
    }

    const checkConstraints = (mediaType: MediaTrackConstraints) => {
      const supportedMediaConstraints = navigator.mediaDevices.getSupportedConstraints();
      const unSupportedConstraints = Object.keys(mediaType).filter(
        constraint =>
          !(supportedMediaConstraints as { [key: string]: any })[constraint]
      );

      if (unSupportedConstraints.length > 0) {
        console.error(
          `The constraints ${unSupportedConstraints.join(
            ","
          )} doesn't support on this browser. Please check your ReactMediaRecorder component.`
        );
      }
    };

    if (typeof audio === "object") {
      checkConstraints(audio);
    }
    if (typeof video === "object") {
      checkConstraints(video);
    }

    if (mediaRecorderOptions && mediaRecorderOptions.mimeType) {
      if (!MediaRecorder.isTypeSupported(mediaRecorderOptions.mimeType)) {
        console.error(
          `The specified MIME type you supplied for MediaRecorder doesn't support this browser`
        );
      }
    }

    async function loadStream() {
      const stream = await getMediaStream();
      mediaStream.current = stream;
    }

    if (!mediaStream.current) {
      loadStream();
    }
  }, [audio, screen, video, getMediaStream, mediaRecorderOptions]);

  // Media Recorder Handlers

  const startRecording = async () => {
    if (!mediaStream.current) {
      try {
        setStatus("acquiring_media");
        const stream = await getMediaStream();
        setStatus("idle");
        mediaStream.current = stream;
      } catch (error) {
        setError(error.name);
        setStatus("idle");
        return;
      }
    }
    mediaRecorder.current = new MediaRecorder(mediaStream.current);
    mediaRecorder.current.ondataavailable = onRecordingActive;
    mediaRecorder.current.onstop = onRecordingStop;
    mediaRecorder.current.onerror = () => {
      setError("NO_RECORDER");
      setStatus("idle");
    };
    mediaRecorder.current.start();
    setStatus("recording");
  };

  const onRecordingActive = ({ data }: BlobEvent) => {
    mediaChunks.current.push(data);
  };

  const onRecordingStop = () => {
    const blobProperty: BlobPropertyBag =
      blobPropertyBag || video ? { type: "video/mp4" } : { type: "audio/wav" };
    const blob = new Blob(mediaChunks.current, blobProperty);
    const url = URL.createObjectURL(blob);
    setStatus("stopped");
    setMediaBlobUrl(url);
    onStop(url);
  };

  const muteAudio = (mute: boolean) => {
    setIsAudioMuted(mute);
    if (mediaStream.current) {
      mediaStream.current
        .getAudioTracks()
        .forEach(audioTrack => (audioTrack.enabled = !mute));
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.pause();
    }
  };
  const resumeRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "paused") {
      mediaRecorder.current.resume();
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      setStatus("stopping");
      mediaRecorder.current.stop();
    }
  };

  return render({
    error: RecorderErrors[error],
    muteAudio: () => muteAudio(true),
    unMuteAudio: () => muteAudio(false),
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    mediaBlobUrl,
    status,
    isAudioMuted
  });
};
