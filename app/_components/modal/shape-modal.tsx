import { Dispatch, useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/_components/modal/modal";
import { ModalTitle } from "@/_components/modal/modal-title";
import ModalContent from "@/_components/modal/modal-content";
import { ModalActions } from "@/_components/modal/modal-actions";
import { Button } from "@/_components/buttons/button";
import { IconButton } from "@/_components/buttons/icon-button";
import { ButtonStyle } from "@/_components/theme/styles";
import StepperInput from "@/_components/stepper-input";
import InlineSelect from "@/_components/inline-select";
import removeNonDigits from "@/_lib/remove-non-digits";
import DeleteIcon from "@/_icons/delete-icon";
import { CM, IN, MM } from "@/_lib/unit";
import {
  Shape,
  ShapeType,
  ShapeUnit,
  Shapes,
  TriangleMode,
} from "@/_lib/interfaces/shape";
import { ShapeAction } from "@/_reducers/shapesReducer";
import { validateShape } from "@/_lib/shapes";

const defaultValues = {
  width: "10",
  height: "10",
  base: "10",
  triHeight: "10",
  sideA: "10",
  sideB: "10",
  sideC: "10",
  radius: "10",
  innerRadius: "0",
  angle: "90",
  x: "0",
  y: "0",
  rotation: "0",
};

export default function ShapeModal({
  open,
  onClose,
  shapes,
  dispatchShapesAction,
}: {
  open: boolean;
  onClose: () => void;
  shapes: Shapes;
  dispatchShapesAction: Dispatch<ShapeAction>;
}) {
  const t = useTranslations("ShapeModal");
  const g = useTranslations("General");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [shapeType, setShapeType] = useState<ShapeType>("rectangle");
  const [unit, setUnit] = useState<ShapeUnit>(IN as ShapeUnit);
  const [triangleMode, setTriangleMode] =
    useState<TriangleMode>("base-height");
  const [widthStr, setWidthStr] = useState(defaultValues.width);
  const [heightStr, setHeightStr] = useState(defaultValues.height);
  const [baseStr, setBaseStr] = useState(defaultValues.base);
  const [triHeightStr, setTriHeightStr] = useState(defaultValues.triHeight);
  const [sideAStr, setSideAStr] = useState(defaultValues.sideA);
  const [sideBStr, setSideBStr] = useState(defaultValues.sideB);
  const [sideCStr, setSideCStr] = useState(defaultValues.sideC);
  const [radiusStr, setRadiusStr] = useState(defaultValues.radius);
  const [innerRadiusStr, setInnerRadiusStr] = useState(
    defaultValues.innerRadius,
  );
  const [angleStr, setAngleStr] = useState(defaultValues.angle);
  const [xStr, setXStr] = useState(defaultValues.x);
  const [yStr, setYStr] = useState(defaultValues.y);
  const [rotationStr, setRotationStr] = useState(defaultValues.rotation);

  const typeOptions = [
    { label: t("rectangle"), value: "rectangle" },
    { label: t("ellipse"), value: "ellipse" },
    { label: t("triangle"), value: "triangle" },
    { label: t("pie"), value: "pie" },
  ];
  const unitOptions = [
    { label: t("inches"), value: IN },
    { label: t("centimeters"), value: CM },
    { label: t("millimeters"), value: MM },
  ];
  const triangleModeOptions = [
    { label: t("baseAndHeight"), value: "base-height" },
    { label: t("threeSides"), value: "sides" },
  ];

  function resetForm() {
    setEditingId(null);
    setName("");
    setShapeType("rectangle");
    setUnit(IN as ShapeUnit);
    setTriangleMode("base-height");
    setWidthStr(defaultValues.width);
    setHeightStr(defaultValues.height);
    setBaseStr(defaultValues.base);
    setTriHeightStr(defaultValues.triHeight);
    setSideAStr(defaultValues.sideA);
    setSideBStr(defaultValues.sideB);
    setSideCStr(defaultValues.sideC);
    setRadiusStr(defaultValues.radius);
    setInnerRadiusStr(defaultValues.innerRadius);
    setAngleStr(defaultValues.angle);
    setXStr(defaultValues.x);
    setYStr(defaultValues.y);
    setRotationStr(defaultValues.rotation);
  }

  function buildShape(id: string): Shape {
    const common = {
      id,
      name: name.trim() || t(shapeType),
      unit,
      x: Number(xStr) || 0,
      y: Number(yStr) || 0,
      rotation: Number(rotationStr) || 0,
      visible: true,
    };
    switch (shapeType) {
      case "rectangle":
        return {
          ...common,
          type: "rectangle",
          width: Number(widthStr),
          height: Number(heightStr),
        };
      case "ellipse":
        return {
          ...common,
          type: "ellipse",
          width: Number(widthStr),
          height: Number(heightStr),
        };
      case "triangle":
        return triangleMode === "base-height"
          ? {
              ...common,
              type: "triangle",
              mode: "base-height",
              base: Number(baseStr),
              height: Number(triHeightStr),
            }
          : {
              ...common,
              type: "triangle",
              mode: "sides",
              sideA: Number(sideAStr),
              sideB: Number(sideBStr),
              sideC: Number(sideCStr),
            };
      case "pie":
        return {
          ...common,
          type: "pie",
          radius: Number(radiusStr),
          innerRadius: Number(innerRadiusStr),
          angle: Number(angleStr),
        };
    }
  }

  const draft = buildShape(editingId ?? "draft");
  const error = validateShape(draft);

  function startEdit(shape: Shape) {
    setEditingId(shape.id);
    setName(shape.name);
    setShapeType(shape.type);
    setUnit(shape.unit);
    setXStr(String(shape.x));
    setYStr(String(shape.y));
    setRotationStr(String(shape.rotation));
    if (shape.type === "rectangle" || shape.type === "ellipse") {
      setWidthStr(String(shape.width));
      setHeightStr(String(shape.height));
    } else if (shape.type === "triangle") {
      setTriangleMode(shape.mode);
      setBaseStr(String(shape.base ?? 0));
      setTriHeightStr(String(shape.height ?? 0));
      setSideAStr(String(shape.sideA ?? 0));
      setSideBStr(String(shape.sideB ?? 0));
      setSideCStr(String(shape.sideC ?? 0));
    } else if (shape.type === "pie") {
      setRadiusStr(String(shape.radius));
      setInnerRadiusStr(String(shape.innerRadius));
      setAngleStr(String(shape.angle));
    }
  }

  function handleDelete(id: string) {
    dispatchShapesAction({ type: "remove-shape", id });
    if (editingId === id) {
      resetForm();
    }
  }

  function handleSubmit() {
    if (error) {
      return;
    }
    const id = editingId ?? crypto.randomUUID();
    dispatchShapesAction({
      type: editingId ? "update-shape" : "add-shape",
      shape: buildShape(id),
    });
    resetForm();
  }

  return (
    <Modal open={open}>
      <ModalTitle>{t("title")}</ModalTitle>
      <ModalContent>
        {Object.keys(shapes).length > 0 && (
          <ul className="mb-4 max-h-40 overflow-y-auto scrollbar divide-y divide-gray-200 dark:divide-gray-700">
            {Object.values(shapes).map((shape) => (
              <li
                key={shape.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <label className="flex items-center gap-2 grow min-w-0">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-purple-600 shrink-0"
                    checked={shape.visible}
                    onChange={() =>
                      dispatchShapesAction({
                        type: "toggle-visibility",
                        id: shape.id,
                      })
                    }
                  />
                  <span className="truncate text-sm">{shape.name}</span>
                </label>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    style={ButtonStyle.OUTLINE}
                    className="!px-2 !py-1"
                    onClick={() => startEdit(shape)}
                  >
                    {t("edit")}
                  </Button>
                  <IconButton onClick={() => handleDelete(shape.id)}>
                    <DeleteIcon ariaLabel={t("delete")} />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <InlineSelect
              id="shapeType"
              name="shapeType"
              value={shapeType}
              handleChange={(e) => setShapeType(e.target.value as ShapeType)}
              options={typeOptions}
            />
            <InlineSelect
              id="shapeUnit"
              name="shapeUnit"
              value={unit}
              handleChange={(e) => setUnit(e.target.value as ShapeUnit)}
              options={unitOptions}
            />
          </div>

          <input
            type="text"
            placeholder={t("namePlaceholder")}
            className="h-11 py-2.5 px-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-black dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-800 dark:focus:border-blue-800"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {(shapeType === "rectangle" || shapeType === "ellipse") && (
            <div className="flex flex-wrap gap-3">
              <StepperInput
                inputClassName="w-20"
                label={t("width")}
                value={widthStr}
                handleChange={(e) =>
                  setWidthStr(removeNonDigits(e.target.value, widthStr))
                }
                onStep={(delta) =>
                  setWidthStr(String(Math.max(0, Number(widthStr) + delta)))
                }
              />
              <StepperInput
                inputClassName="w-20"
                label={t("height")}
                value={heightStr}
                handleChange={(e) =>
                  setHeightStr(removeNonDigits(e.target.value, heightStr))
                }
                onStep={(delta) =>
                  setHeightStr(String(Math.max(0, Number(heightStr) + delta)))
                }
              />
            </div>
          )}

          {shapeType === "triangle" && (
            <>
              <InlineSelect
                id="triangleMode"
                name="triangleMode"
                value={triangleMode}
                handleChange={(e) =>
                  setTriangleMode(e.target.value as TriangleMode)
                }
                options={triangleModeOptions}
              />
              {triangleMode === "base-height" ? (
                <div className="flex flex-wrap gap-3">
                  <StepperInput
                    inputClassName="w-20"
                    label={t("base")}
                    value={baseStr}
                    handleChange={(e) =>
                      setBaseStr(removeNonDigits(e.target.value, baseStr))
                    }
                    onStep={(delta) =>
                      setBaseStr(String(Math.max(0, Number(baseStr) + delta)))
                    }
                  />
                  <StepperInput
                    inputClassName="w-20"
                    label={t("height")}
                    value={triHeightStr}
                    handleChange={(e) =>
                      setTriHeightStr(
                        removeNonDigits(e.target.value, triHeightStr),
                      )
                    }
                    onStep={(delta) =>
                      setTriHeightStr(
                        String(Math.max(0, Number(triHeightStr) + delta)),
                      )
                    }
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <StepperInput
                    inputClassName="w-20"
                    label={t("sideA")}
                    value={sideAStr}
                    handleChange={(e) =>
                      setSideAStr(removeNonDigits(e.target.value, sideAStr))
                    }
                    onStep={(delta) =>
                      setSideAStr(
                        String(Math.max(0, Number(sideAStr) + delta)),
                      )
                    }
                  />
                  <StepperInput
                    inputClassName="w-20"
                    label={t("sideB")}
                    value={sideBStr}
                    handleChange={(e) =>
                      setSideBStr(removeNonDigits(e.target.value, sideBStr))
                    }
                    onStep={(delta) =>
                      setSideBStr(
                        String(Math.max(0, Number(sideBStr) + delta)),
                      )
                    }
                  />
                  <StepperInput
                    inputClassName="w-20"
                    label={t("sideC")}
                    value={sideCStr}
                    handleChange={(e) =>
                      setSideCStr(removeNonDigits(e.target.value, sideCStr))
                    }
                    onStep={(delta) =>
                      setSideCStr(
                        String(Math.max(0, Number(sideCStr) + delta)),
                      )
                    }
                  />
                </div>
              )}
            </>
          )}

          {shapeType === "pie" && (
            <div className="flex flex-wrap gap-3">
              <StepperInput
                inputClassName="w-20"
                label={t("radius")}
                value={radiusStr}
                handleChange={(e) =>
                  setRadiusStr(removeNonDigits(e.target.value, radiusStr))
                }
                onStep={(delta) =>
                  setRadiusStr(String(Math.max(0, Number(radiusStr) + delta)))
                }
              />
              <StepperInput
                inputClassName="w-20"
                label={t("innerRadius")}
                value={innerRadiusStr}
                handleChange={(e) =>
                  setInnerRadiusStr(
                    removeNonDigits(e.target.value, innerRadiusStr),
                  )
                }
                onStep={(delta) =>
                  setInnerRadiusStr(
                    String(Math.max(0, Number(innerRadiusStr) + delta)),
                  )
                }
              />
              <StepperInput
                inputClassName="w-20"
                label={t("angle")}
                value={angleStr}
                handleChange={(e) =>
                  setAngleStr(removeNonDigits(e.target.value, angleStr))
                }
                onStep={(delta) =>
                  setAngleStr(
                    String(Math.min(360, Math.max(0, Number(angleStr) + delta))),
                  )
                }
              />
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <StepperInput
              inputClassName="w-20"
              label={t("positionX")}
              value={xStr}
              handleChange={(e) => setXStr(removeNonDigits(e.target.value, xStr))}
              onStep={(delta) => setXStr(String(Number(xStr) + delta))}
            />
            <StepperInput
              inputClassName="w-20"
              label={t("positionY")}
              value={yStr}
              handleChange={(e) => setYStr(removeNonDigits(e.target.value, yStr))}
              onStep={(delta) => setYStr(String(Number(yStr) + delta))}
            />
            <StepperInput
              inputClassName="w-20"
              label={t("rotation")}
              value={rotationStr}
              handleChange={(e) =>
                setRotationStr(removeNonDigits(e.target.value, rotationStr))
              }
              onStep={(delta) => setRotationStr(String(Number(rotationStr) + delta))}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </ModalContent>

      <ModalActions>
        <Button style={ButtonStyle.FILLED} onClick={handleSubmit}>
          {editingId ? t("saveChanges") : t("addShape")}
        </Button>
        {editingId && <Button onClick={resetForm}>{t("cancelEdit")}</Button>}
        <Button onClick={onClose}>{g("close")}</Button>
      </ModalActions>
    </Modal>
  );
}
