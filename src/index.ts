import { ReactElement, useCallback, useEffect, useRef, useState } from "react";

export interface VideoUploadStorageStrategy {
  /** Sets blob properties. This will be called only before the first call of storeChunk() after construction or reset(). */
  setBlobProperties(blobProperties: BlobPropertyBag): void;

  /** Handle recorded video chunk. */
  storeChunk(chunk: Blob): void;

  /** Informs this storage that the last chunk has been provided. */
  stop(): void;

  /** Resets this storage so that a new video can be recorded. */
  reset(): void;

  /** Gets the URL where the video is stored. */
  getUrl(url: String): String;

  /** If this storage stores all chunks in a merged Blob, returns it; otherwise returns undefined.*/
  getBlob(blob: Blob): Blob;
}

export type ReactMediaRecorderRenderProps = {
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
  previewStream: MediaStream | null;
  clearBlobUrl: () => void;
};

export type ReactMediaRecorderHookProps = {
  StorageStrategyOption?: () => void;
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
  screen?: boolean;
  onStop?: (blobUrl: string, blob: void) => void;
  blobPropertyBag?: BlobPropertyBag;
  mediaRecorderOptions?: MediaRecorderOptions | null;
};
export type ReactMediaRecorderProps = ReactMediaRecorderHookProps & {
  render: (props: ReactMediaRecorderRenderProps) => ReactElement;
};

export type StatusMessages =
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

export enum RecorderErrors {
  AbortError = "media_aborted",
  NotAllowedError = "permission_denied",
  NotFoundError = "no_specified_media_found",
  NotReadableError = "media_in_use",
  OverconstrainedError = "invalid_media_constraints",
  TypeError = "no_constraints",
  NONE = "",
  NO_RECORDER = "recorder_error",
}

class uploadStorageStrategy implements VideoUploadStorageStrategy {
  setBlobProperties(blobProperties: BlobPropertyBag): void {
    throw new Error("Method not implemented.");
  }
  storeChunk(chunk: Blob): void {
    throw new Error("Method not implemented.");
  }
  stop(): void {
    throw new Error("Method not implemented.");
  }
  reset(): void {
    throw new Error("Method not implemented.");
  }
  getUrl(): String {
    throw new Error("Method not implemented.");
  }
  getBlob(blob: Blob): Blob {
    return blob;
  }
}

class localStorageStrategy implements VideoUploadStorageStrategy {
  blobProperties: any;
  url: any;
  blob: any;
  mediaChunks: Blob[] = [];

  setBlobProperties(blobProperties: BlobPropertyBag): void {
    this.blobProperties = blobProperties;
  }
  storeChunk(chunk: Blob) {
    this.mediaChunks.push(chunk);
  }
  stop(): String {
    const blob = new Blob(this.mediaChunks, this.blobProperties);
    const url = URL.createObjectURL(blob);
    return url;
  }
  reset(): void {
    throw new Error("Method not implemented.");
  }
  getUrl(url: String): String {
    return url;
  }
  getBlob(blob: Blob): Blob {
    return blob;
  }
}
class StorageStrategy {
  constructor(private StorageStrategy: any) {}

  setBlobProperties = this.StorageStrategy.setBlobProperties();
  storeChunk = this.StorageStrategy.storeChunk();
  stop = this.StorageStrategy.stop();
  reset = this.StorageStrategy.reset();
  getUrl = this.StorageStrategy.getUrl("asdasd");
  getBlob = this.StorageStrategy.getBlob();
}

export function useReactMediaRecorder({
  StorageStrategyOption = () => {},
  audio = true,
  video = false,
  onStop = () => null,
  blobPropertyBag,
  screen = false,
  mediaRecorderOptions = null,
}: ReactMediaRecorderHookProps): ReactMediaRecorderRenderProps {
  const storageStrategy = new StorageStrategy(new localStorageStrategy());
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mediaChunks = useRef<Blob[]>([]);
  const mediaStream = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<StatusMessages>("idle");
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<keyof typeof RecorderErrors>("NONE");

  const getMediaStream = useCallback(async () => {
    setStatus("acquiring_media");
    const requiredMedia: MediaStreamConstraints = {
      audio: typeof audio === "boolean" ? !!audio : audio,
      video: typeof video === "boolean" ? !!video : video,
    };
    try {
      if (screen) {
        //@ts-ignore
        const stream = (await window.navigator.mediaDevices.getDisplayMedia({
          video: video || true,
        })) as MediaStream;
        if (audio) {
          const audioStream = await window.navigator.mediaDevices.getUserMedia({
            audio,
          });

          audioStream
            .getAudioTracks()
            .forEach((audioTrack) => stream.addTrack(audioTrack));
        }
        mediaStream.current = stream;
      } else {
        const stream = await window.navigator.mediaDevices.getUserMedia(
          requiredMedia
        );
        mediaStream.current = stream;
      }
      setStatus("idle");
    } catch (error) {
      setError(error.name);
      setStatus("idle");
    }
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
        (constraint) =>
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

    if (!mediaStream.current) {
      getMediaStream();
    }
  }, [audio, screen, video, getMediaStream, mediaRecorderOptions]);

  // Media Recorder Handlers

  const startRecording = async () => {
    setError("NONE");
    if (!mediaStream.current) {
      await getMediaStream();
    }
    if (mediaStream.current) {
      const isStreamEnded = mediaStream.current
        .getTracks()
        .some((track) => track.readyState === "ended");
      if (isStreamEnded) {
        await getMediaStream();
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
    }
  };

  const onRecordingActive = ({ data }: BlobEvent) => {
    let blobPropertiesState: Boolean = false;
    if (!blobPropertiesState) {
      const blobProperties: BlobPropertyBag = Object.assign(
        { type: data.type },
        blobPropertyBag ||
          (video ? { type: "video/mp4" } : { type: "audio/wav" })
      );

      storageStrategy.setBlobProperties(blobProperties);
      blobPropertiesState = true;
    }

    storageStrategy.storeChunk(data);
  };

  const onRecordingStop = () => {
    storageStrategy.stop();
    const url = storageStrategy.getUrl();
    setStatus("stopped");
    setMediaBlobUrl(url);
    onStop(url, storageStrategy.getBlob());
  };

  const muteAudio = (mute: boolean) => {
    setIsAudioMuted(mute);
    if (mediaStream.current) {
      mediaStream.current
        .getAudioTracks()
        .forEach((audioTrack) => (audioTrack.enabled = !mute));
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
      if (mediaRecorder.current.state !== "inactive") {
        setStatus("stopping");
        mediaRecorder.current.stop();
        mediaStream.current &&
          mediaStream.current.getTracks().forEach((track) => track.stop());
        storageStrategy.reset();
      }
    }
  };

  return {
    error: RecorderErrors[error],
    muteAudio: () => muteAudio(true),
    unMuteAudio: () => muteAudio(false),
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    mediaBlobUrl,
    status,
    isAudioMuted,
    previewStream: mediaStream.current
      ? new MediaStream(mediaStream.current.getVideoTracks())
      : null,
    clearBlobUrl: () => setMediaBlobUrl(null),
  };
}

export const ReactMediaRecorder = (props: ReactMediaRecorderProps) =>
  props.render(useReactMediaRecorder(props));
