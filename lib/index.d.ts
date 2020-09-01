/// <reference types="dom-mediacapture-record" />
import { ReactElement } from "react";
declare type ReactMediaRecorderRenderProps = {
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
declare type ReactMediaRecorderProps = {
    render: (props: ReactMediaRecorderRenderProps) => ReactElement;
    audio?: boolean | MediaTrackConstraints;
    video?: boolean | MediaTrackConstraints;
    screen?: boolean;
    onStop?: (blobUrl: string, blob: Blob) => void;
    blobPropertyBag?: BlobPropertyBag;
    mediaRecorderOptions?: MediaRecorderOptions | null;
    deviceId?: string | null;
};
declare type StatusMessages = "media_aborted" | "permission_denied" | "no_specified_media_found" | "media_in_use" | "invalid_media_constraints" | "no_constraints" | "recorder_error" | "idle" | "acquiring_media" | "delayed_start" | "recording" | "stopping" | "stopped";
export declare const ReactMediaRecorder: ({ render, audio, video, onStop, blobPropertyBag, screen, mediaRecorderOptions, deviceId, }: ReactMediaRecorderProps) => ReactElement<any, string | ((props: any) => ReactElement<any, string | any | (new (props: any) => import("react").Component<any, any, any>)> | null) | (new (props: any) => import("react").Component<any, any, any>)>;
export {};
