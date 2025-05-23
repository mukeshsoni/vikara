import { useForm } from "@mantine/form";
import {
  Button,
  Flex,
  Text,
  Title,
  Fieldset,
  Select,
  Checkbox,
  Divider,
  NumberInput,
  Space,
  Slider,
} from "@mantine/core";
import {
  resizeResolutionInOptions,
  resizeInOptions,
  resizeToFitOptions,
  imageFormatOptions,
  INITIAL_VALUES,
} from "./export_form_input_config";
import { zodResolver } from "mantine-form-zod-resolver";
import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { exportFormSchema, ExportSettings } from "./export_form_schema";
import { notifications } from "@mantine/notifications";

function showItemInFolder(path: string) {
  return invoke("show_item_in_folder", { path });
}

function App() {
  const [imageSrc, setImageSrc] = useState<string | null>();
  const form = useForm({
    mode: "controlled",
    initialValues: INITIAL_VALUES,
    validate: zodResolver(exportFormSchema),
  });
  const {
    imageSizing: {
      resizeToFit,
      resizeEnabled,
      resizeIn,
      resizeWidth,
      resizeHeight,
      resizeSize,
      resizeResolution,
      resizeResolutionIn,
    },
    fileSettings: { imageFormat },
  } = form.values;

  async function handleSubmit(values: ExportSettings) {
    try {
      if (imageSrc) {
        await invoke("convert_images", {
          imagePaths: [imageSrc],
          exportSettings: values,
        });
        showItemInFolder(imageSrc);
      } else {
        notifications.show({
          title: "Select image",
          message: `Please select an image to convert`,
          autoClose: false,
        });
      }
    } catch (e) {
      console.error("Error exporting image:", e);
    }
  }

  async function openFileDialog() {
    const path = await open({ multiple: false, directory: false });
    setImageSrc(path);
  }
  function handleClearClick() {
    setImageSrc(null);
  }
  function handleResizeInChange(newValue: string | null) {
    if (newValue) {
      const value = newValue as "pixels" | "inches" | "cms";
      form.setFieldValue("imageSizing.resizeIn", value);

      // If the resizeIn option changes, we need to convert the resize values to the new unit
      const resolutionPixelsPerIn =
        resizeResolutionIn === "pixels_per_inch"
          ? resizeResolution
          : resizeResolution * 2.54;
      const resolutionPixelsPerCm =
        resizeResolutionIn === "pixels_per_cm"
          ? resizeResolution
          : resizeResolution / 2.54;
      let newResizeWidth = resizeWidth;
      let newResizeHeight = resizeHeight;
      let newResizeSize = resizeSize;

      switch (resizeIn) {
        case "pixels": {
          switch (value) {
            case "inches": {
              newResizeWidth = resizeWidth / resolutionPixelsPerIn;
              newResizeHeight = resizeHeight / resolutionPixelsPerIn;
              newResizeSize = resizeSize / resolutionPixelsPerIn;
              break;
            }
            case "cms": {
              newResizeWidth = resizeWidth / resolutionPixelsPerCm;
              newResizeHeight = resizeHeight / resolutionPixelsPerCm;
              newResizeSize = resizeSize / resolutionPixelsPerCm;
              break;
            }
          }
          break;
        }
        case "inches": {
          switch (value) {
            case "pixels": {
              newResizeWidth = resizeWidth * resolutionPixelsPerIn;
              newResizeHeight = resizeHeight * resolutionPixelsPerIn;
              newResizeSize = resizeSize * resolutionPixelsPerIn;
              break;
            }
            case "cms": {
              newResizeWidth = resizeWidth * 2.54;
              newResizeHeight = resizeHeight * 2.54;
              newResizeSize = resizeSize * 2.54;
              break;
            }
          }
          break;
        }
        case "cms": {
          switch (value) {
            case "pixels": {
              newResizeWidth = resizeWidth * resolutionPixelsPerCm;
              newResizeHeight = resizeHeight * resolutionPixelsPerCm;
              newResizeSize = resizeSize * resolutionPixelsPerCm;
              break;
            }
            case "inches": {
              newResizeWidth = resizeWidth / 2.54;
              newResizeHeight = resizeHeight / 2.54;
              newResizeSize = resizeSize / 2.54;
              break;
            }
          }
          break;
        }
      }
      form.setFieldValue("imageSizing.resizeWidth", newResizeWidth);
      form.setFieldValue("imageSizing.resizeHeight", newResizeHeight);
      form.setFieldValue("imageSizing.resizeSize", newResizeSize);
    }
  }
  // If resolutionIn option changes, we change the resolution value accordingly
  function handleResolutionInChange(newValue: string | null) {
    if (newValue) {
      const value = newValue as "pixels_per_inch" | "pixels_per_cm";
      if (resizeResolutionIn !== value) {
        if (resizeResolutionIn === "pixels_per_cm") {
          form.setFieldValue(
            "imageSizing.resizeResolution",
            resizeResolution * 2.54,
          );
        } else {
          form.setFieldValue(
            "imageSizing.resizeResolution",
            resizeResolution / 2.54,
          );
        }

        form.setFieldValue("imageSizing.resizeResolutionIn", value);
      }
    }
  }

  return (
    <Flex
      component="main"
      direction="column"
      style={{ overflow: "hidden", height: "100vh", width: "100vw" }}
    >
      <Flex style={{ flex: 1, height: "100%" }}>
        <Flex style={{ flex: 1 }} direction="column" p={4} gap={4}>
          <Title order={1} mb={4} ml="sm">
            Convert images
          </Title>
          {imageSrc ? (
            <Flex
              justify={"center"}
              align={"center"}
              direction="column"
              style={{ flex: 1 }}
            >
              <img
                src={convertFileSrc(imageSrc)}
                width="400"
                style={{ objectFit: "contain" }}
              />
            </Flex>
          ) : (
            <Flex
              justify="center"
              align="center"
              m="xl"
              style={{ border: `2px dashed gray`, height: 300 }}
            >
              <Button variant="primary" onClick={openFileDialog} size="xl">
                Select file
              </Button>
            </Flex>
          )}
          {imageSrc ? (
            <Flex
              align="center"
              justify="end"
              gap="md"
              p="md"
              style={{ borderTop: "1px solid gray" }}
            >
              <Button variant="light" onClick={handleClearClick}>
                Clear
              </Button>
              <Button
                variant="filled"
                onClick={() => form.onSubmit(handleSubmit)()}
              >
                Convert
              </Button>
            </Flex>
          ) : null}
        </Flex>
        <Divider orientation="vertical" mx={4} />
        <Flex direction="column" w={350}>
          <Title order={3} ml="md" my="md">
            Settings
          </Title>
          <form
            onSubmit={form.onSubmit(handleSubmit)}
            style={{ overflowY: "auto", padding: 16 }}
          >
            <Fieldset
              legend="File settings"
              style={{ display: "flex", flexDirection: "column" }}
            >
              <Select
                label="Image Format"
                data={imageFormatOptions}
                {...form.getInputProps("fileSettings.imageFormat")}
                allowDeselect={false}
              />
              <Space h="md" />
              {imageFormat === "jpeg" || imageFormat === "avif" ? (
                <Flex gap={4}>
                  <Text size="sm">Quality</Text>
                  <Space w={4} />
                  <Slider
                    min={0}
                    max={100}
                    {...form.getInputProps("fileSettings.quality")}
                    style={{ flex: 1 }}
                  />
                </Flex>
              ) : null}
            </Fieldset>
            <Fieldset
              legend="Image Sizing"
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <Checkbox
                label="Enable resizing"
                {...form.getInputProps("imageSizing.resizeEnabled", {
                  type: "checkbox",
                })}
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                }}
                disabled={imageFormat === "original"}
                key={form.key("imageSizing.resizeEnabled")}
              />
              <Select
                label="Resize to fit"
                data={resizeToFitOptions}
                {...form.getInputProps("imageSizing.resizeToFit")}
                disabled={!resizeEnabled}
                allowDeselect={false}
              />
              {resizeToFit === "width_and_height" ? (
                <>
                  <NumberInput
                    label="Width"
                    {...form.getInputProps("imageSizing.resizeWidth")}
                    disabled={!resizeEnabled}
                  />
                  <NumberInput
                    label="Height"
                    {...form.getInputProps("imageSizing.resizeHeight")}
                    disabled={!resizeEnabled}
                  />
                  <Select
                    data={resizeInOptions}
                    defaultValue={"pixels"}
                    {...form.getInputProps("imageSizing.resizeIn")}
                    disabled={!resizeEnabled}
                    onChange={handleResizeInChange}
                    allowDeselect={false}
                  />
                </>
              ) : null}
              {resizeToFit === "short_edge" || resizeToFit === "long_edge" ? (
                <>
                  <NumberInput
                    label="Size"
                    {...form.getInputProps("imageSizing.resizeSize")}
                    disabled={!resizeEnabled}
                  />
                  <Select
                    label="Units"
                    data={resizeInOptions}
                    defaultValue={"pixels"}
                    {...form.getInputProps("imageSizing.resizeIn")}
                    disabled={!resizeEnabled}
                    onChange={handleResizeInChange}
                    allowDeselect={false}
                  />
                </>
              ) : null}
              {resizeToFit === "megapixels" ? (
                <Flex align="center" gap={4}>
                  <NumberInput
                    label="Size"
                    {...form.getInputProps("imageSizing.resizeSizeMegapixels")}
                    disabled={!resizeEnabled}
                  />
                  <Text>megapixels</Text>
                </Flex>
              ) : null}
              <NumberInput
                label={"Resolution"}
                {...form.getInputProps("imageSizing.resizeResolution")}
                disabled={!resizeEnabled}
              />
              <Select
                data={resizeResolutionInOptions}
                {...form.getInputProps("imageSizing.resizeResolutionIn")}
                onChange={handleResolutionInChange}
                disabled={!resizeEnabled}
                allowDeselect={false}
              />
            </Fieldset>
          </form>
        </Flex>
      </Flex>
    </Flex>
  );
}

export default App;
