import { Dispatch, SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/_components/buttons/icon-button";
import Tooltip from "@/_components/tooltip/tooltip";
import FlipHorizontalIcon from "@/_icons/flip-horizontal-icon";
import FlipVerticalIcon from "@/_icons/flip-vertical-icon";
import Rotate90DegreesCWIcon from "@/_icons/rotate-90-degrees-cw-icon";
import DuplicateIcon from "@/_icons/duplicate-icon";
import DeleteIcon from "@/_icons/delete-icon";
import { PieceInstance } from "@/_lib/interfaces/piece-instance";
import { PieceInstanceAction } from "@/_reducers/pieceInstancesReducer";

export default function PieceToolbar({
  instance,
  dispatchInstancesAction,
  setSelectedId,
}: {
  instance: PieceInstance;
  dispatchInstancesAction: Dispatch<PieceInstanceAction>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
}) {
  const t = useTranslations("PieceToolbar");

  function handleRotate90() {
    dispatchInstancesAction({
      type: "update-instance",
      instance: { ...instance, rotation: (instance.rotation + 90) % 360 },
    });
  }

  function handleFlipHorizontal() {
    dispatchInstancesAction({
      type: "update-instance",
      instance: { ...instance, flipHorizontal: !instance.flipHorizontal },
    });
  }

  function handleFlipVertical() {
    dispatchInstancesAction({
      type: "update-instance",
      instance: { ...instance, flipVertical: !instance.flipVertical },
    });
  }

  function handleDuplicate() {
    const newId = `${instance.contentId}-${Date.now()}`;
    dispatchInstancesAction({
      type: "duplicate-instance",
      id: instance.id,
      newId,
    });
    setSelectedId(newId);
  }

  function handleDelete() {
    dispatchInstancesAction({ type: "remove-instance", id: instance.id });
    setSelectedId(null);
  }

  return (
    <menu className="pointer-events-auto flex gap-1 p-1.5 bg-white dark:bg-black border border-2 border-black dark:border-white rounded-full shadow-lg">
      {instance.sourceType === "pdf" && (
        <Tooltip description={t("rotate90")}>
          <IconButton onClick={handleRotate90}>
            <Rotate90DegreesCWIcon ariaLabel={t("rotate90")} />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip description={t("flipHorizontal")}>
        <IconButton
          onClick={handleFlipHorizontal}
          active={instance.flipHorizontal}
        >
          <FlipHorizontalIcon ariaLabel={t("flipHorizontal")} />
        </IconButton>
      </Tooltip>
      <Tooltip description={t("flipVertical")}>
        <IconButton
          onClick={handleFlipVertical}
          active={instance.flipVertical}
        >
          <FlipVerticalIcon ariaLabel={t("flipVertical")} />
        </IconButton>
      </Tooltip>
      <Tooltip description={t("duplicate")}>
        <IconButton onClick={handleDuplicate}>
          <DuplicateIcon ariaLabel={t("duplicate")} />
        </IconButton>
      </Tooltip>
      <Tooltip description={t("delete")}>
        <IconButton onClick={handleDelete}>
          <DeleteIcon ariaLabel={t("delete")} />
        </IconButton>
      </Tooltip>
    </menu>
  );
}
