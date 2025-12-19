"use client";
import PinProfileButton from "./PinProfileButton";

export default function PinProfileButtonWrapper({ profileId }: { profileId: string }) {
  return <PinProfileButton profileId={profileId} />;
}