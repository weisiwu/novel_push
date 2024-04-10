
    def _upload_cover(self, image_binary: bytes, image_mime: str):
        return self.post(
            "https://member.bilibili.com/x/vu/web/cover/up",
            data={
                "cover": "data:{%s};base64," % image_mime
                + base64.b64encode(image_binary).decode(),
                "csrf": self.cookies.get("bili_jct"),
            },
        )

    def UploadCover(self, path: str):
        """上传封面"""
        mime = mimetypes.guess_type(path)[0] or "image/png"  # fall back to png
        self.logger.debug("%s -> %s" % (path, mime))
        content = open(path, "rb").read()
        self.logger.debug("上传封面图 (%s B)" % len(content))
        resp = self._upload_cover(content, mime)
        resp = resp.json()
        try:
            return resp["data"]["url"]
        except KeyError:
            self.logger.warning("上传失败：%s" % resp)
            return None
