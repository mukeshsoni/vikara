<p align="center"><img align="center" width="100" src="./vikara_logo.png"/></p>
<hr/>

# Vikara - Desktop app to convert images

A simple desktop application to convert images. You can change the quality and dimensions of the converted images.

![Screenshot 1](./images/demo1.png)
![Screenshot 1](./images/demo2.png)

# Supported file formats
<details>
  <summary>Supported image format</summary>
  - JPEG
  - PNG
  - TIFF
  - WEBP
  - BMP
  - ICO
  - GIF
  - AVIF
  - HEIC/HEIF
</details>

Vikara can also read camera raw files and supports the following RAW formats:

<details>
  <summary>Supported RAW file format</summary>
  - raf
  - cr2
  - mrw
  - arw
  - srf
  - sr2
  - mef
  - orf
  - srw
  - erf
  - kdc
  - dcs
  - rw2
  - dcr
  - pef
  - crw
  - raw
  - iiq
  - 3rf
  - nrw
  - nef
  - mos
  - ari
</details>


TODO:

- [x] Make a logo
- [x] Use rust to read images and convert to base64 so that we can show RAW images too
- [x] when user clicks on convert button, show a file dialog to choose export location. Once the export is done, show a toast message as well as put the exported file location in the screen somewhere. Add a button to allow users to open the folder where file was exported.
- [ ] Remember the conversion settings last used by the user. Use tauri store.
