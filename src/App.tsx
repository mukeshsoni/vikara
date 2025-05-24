import { ActionIcon, Loader } from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";
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
import { invoke } from "@tauri-apps/api/core";
import { exportFormSchema, ExportSettings } from "./export_form_schema";
import { notifications } from "@mantine/notifications";
import { SUPPORTED_FILE_EXTENSIONS } from "./constants";

function showItemInFolder(path: string) {
  return invoke("show_item_in_folder", { path });
}

function App() {
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
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

  const [converting, setConverting] = useState(false);
  async function handleSubmit(values: ExportSettings) {
    try {
      if (imagePath) {
        setConverting(true);
        await new Promise((res) => setTimeout(res, 5000));
        await invoke("convert_images", {
          imagePaths: [imagePath],
          exportSettings: values,
        });
        notifications.show({
          message: (
            <Flex align="center">
              <Text>Image converted successfully</Text>
              <Space w="md" />
              <ActionIcon
                variant="default"
                aria-label="Open folder"
                title="Open folder"
                onClick={() =>
                  showItemInFolder(
                    values.exportLocation.folderPath || imagePath,
                  )
                }
              >
                <IconFolder
                  style={{ width: "70%", height: "70%" }}
                  stroke={1.5}
                />
              </ActionIcon>
            </Flex>
          ),
          autoClose: false,
        });
        // showItemInFolder(values.exportLocation.folderPath || imageSrc);
      } else {
        notifications.show({
          title: "Select image",
          message: `Please select an image to convert`,
          autoClose: false,
        });
      }
    } catch (e) {
      console.error("Error exporting image:", e);
      notifications.show({
        title: "Error exporting image",
        message: `We encountered an error while exporting the image`,
        autoClose: false,
      });
    } finally {
      setConverting(false);
    }
  }

  const [imageLoading, setImageLoading] = useState(false);
  async function openFileDialog() {
    const imagePath = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: "file_extensions",
          extensions: SUPPORTED_FILE_EXTENSIONS,
        },
      ],
    });
    try {
      setImageLoading(true);
      const imageBase64 = await invoke("load_image", { imagePath });
      setImagePath(imagePath);
      setImageSrc(`data:image/jpeg;base64, ${imageBase64}`);
    } catch (e) {
      console.error("Error loading image:", e);
      notifications.show({
        title: "Error loading image",
        message: "We encountered an error while loading the image",
        autoClose: false,
      });
    } finally {
      setImageLoading(false);
    }
  }
  function handleClearClick() {
    setImagePath(null);
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
  async function selectExportFolder() {
    try {
      const selectedFolder = await open({
        multiple: false,
        directory: true,
      });
      if (selectedFolder !== null) {
        form.setFieldValue("exportLocation.folderPath", selectedFolder);
        handleSubmit(form.getValues());
      } else {
        console.error("Error getting directory using tauri dialog");
        notifications.show({
          title: "Error selecting export folder",
          message: "Error getting directory using tauri dialog",
          // autoClose: false,
        });
      }
    } catch (e) {
      console.error("Error selecting export folder", e);
      notifications.show({
        title: "Error selecting export folder",
        message: "There was an error selecting the export folder",
        // autoClose: false,
      });
    }
  }

  return (
    <Flex
      component="main"
      direction="column"
      style={{ overflow: "hidden", height: "100vh", width: "100vw" }}
    >
      <Flex style={{ flex: 1, height: "100%" }}>
        <Flex style={{ flex: 1 }} direction="column">
          <Flex p="md">
            <Title order={1}>Convert images</Title>
          </Flex>
          <Divider orientation="horizontal" />
          {/* The overflow: hidden is what makes the image fit inside the container
          Otherwise, the image just increases the size of the container, down or right or both
          based on the image dimensions */}
          <Flex style={{ flex: 1, overflow: "hidden" }} p="md">
            {imageSrc ? (
              <img
                src={imageSrc}
                style={{
                  // If we don't put width and height 100% for image, it pushed the right pane,
                  // if image is larger than the left pane width
                  width: "100%",
                  height: "100%",
                  // to maintain aspect ratio
                  objectFit: "contain",
                }}
              />
            ) : null}
            <Flex
              justify="center"
              align="center"
              style={{
                width: "100%",
                height: "100%",
                border: "2px dashed gray",
                display: imageSrc || imageLoading ? "none" : "flex",
              }}
            >
              <Button variant="primary" onClick={openFileDialog} size="xl">
                Load image
              </Button>
            </Flex>
          </Flex>
          {imageLoading ? (
            <Flex
              justify="center"
              align="center"
              style={{
                width: "100%",
                height: "100%",
                border: "2px dashed gray",
              }}
            >
              <Loader />
            </Flex>
          ) : (
            <></>
          )}
          {imageSrc ? (
            <>
              <Divider orientation="horizontal" />
              <Flex align="center" justify="end" gap="md" p="md">
                <Button
                  variant="light"
                  onClick={handleClearClick}
                  disabled={converting}
                >
                  Convert another image
                </Button>
                <Button
                  loading={converting}
                  variant="filled"
                  onClick={selectExportFolder}
                >
                  Convert
                </Button>
              </Flex>
            </>
          ) : null}
        </Flex>
        <Divider orientation="vertical" mr={4} />
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
