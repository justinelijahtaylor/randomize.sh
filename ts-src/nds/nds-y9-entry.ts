/*----------------------------------------------------------------------------*/
/*--  nds-y9-entry.ts - an entry in the arm9 overlay system                 --*/
/*--  Code based on "Nintendo DS rom tool", copyright (C) DevkitPro         --*/
/*--  Original Code by Rafael Vuijk, Dave Murphy, Alexei Karpenko           --*/
/*--                                                                        --*/
/*--  Ported to Java by Dabomstew under the terms of the GPL:               --*/
/*--  Ported to TypeScript from Java.                                       --*/
/*--                                                                        --*/
/*--  This program is free software: you can redistribute it and/or modify  --*/
/*--  it under the terms of the GNU General Public License as published by  --*/
/*--  the Free Software Foundation, either version 3 of the License, or     --*/
/*--  (at your option) any later version.                                   --*/
/*--                                                                        --*/
/*--  This program is distributed in the hope that it will be useful,       --*/
/*--  but WITHOUT ANY WARRANTY; without even the implied warranty of        --*/
/*--  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the          --*/
/*--  GNU General Public License for more details.                          --*/
/*--                                                                        --*/
/*--  You should have received a copy of the GNU General Public License     --*/
/*--  along with this program. If not, see <http://www.gnu.org/licenses/>.  --*/
/*----------------------------------------------------------------------------*/

import * as fs from "fs";
import * as path from "path";
import { FileFunctions } from "../utils/file-functions";
import type { NDSRom } from "./nds-rom";

enum Extracted {
  NOT,
  TO_FILE,
  TO_RAM,
}

export class NDSY9Entry {
  private parent: NDSRom;
  offset = 0;
  size = 0;
  original_size = 0;
  fileID = 0;
  overlay_id = 0;
  ram_address = 0;
  ram_size = 0;
  bss_size = 0;
  static_start = 0;
  static_end = 0;
  compressed_size = 0;
  compress_flag = 0;
  private status: Extracted = Extracted.NOT;
  private extFilename = "";
  data: Uint8Array | null = null;
  originalCRC = 0;
  private decompressed_data = false;

  constructor(parent: NDSRom) {
    this.parent = parent;
  }

  getContents(): Uint8Array {
    if (this.status === Extracted.NOT) {
      // extract file
      this.parent.reopenROM();
      const fd = this.parent.getBaseRomFd();
      const buf = new Uint8Array(this.original_size);
      const bytesRead = fs.readSync(fd, buf, 0, this.original_size, this.offset);
      if (bytesRead !== this.original_size) {
        throw new Error(
          `Failed to read ${this.original_size} bytes at offset ${this.offset}`,
        );
      }
      this.originalCRC = FileFunctions.getCRC32(buf);

      // Note: BLZ compression/decompression is not ported yet.
      // When compress_flag != 0 and original_size == compressed_size,
      // the data would be BLZ-decompressed here.
      let result = buf;

      if (this.parent.isWritingEnabled()) {
        const tmpDir = this.parent.getTmpFolder();
        const fullPath = `overlay_${String(this.overlay_id).padStart(4, "0")}`;
        this.extFilename = fullPath.replace(/[^A-Za-z0-9_]+/g, "");
        const tmpFile = path.join(tmpDir, this.extFilename);
        fs.writeFileSync(tmpFile, result);
        this.status = Extracted.TO_FILE;
        this.data = null;
        return result;
      } else {
        this.status = Extracted.TO_RAM;
        this.data = result;
        return new Uint8Array(result);
      }
    } else if (this.status === Extracted.TO_RAM) {
      return new Uint8Array(this.data!);
    } else {
      const tmpDir = this.parent.getTmpFolder();
      return new Uint8Array(
        fs.readFileSync(path.join(tmpDir, this.extFilename)),
      );
    }
  }

  writeOverride(data: Uint8Array): void {
    if (this.status === Extracted.NOT) {
      // temp extract
      this.getContents();
    }
    this.size = data.length;
    if (this.status === Extracted.TO_FILE) {
      const tmpDir = this.parent.getTmpFolder();
      fs.writeFileSync(path.join(tmpDir, this.extFilename), data);
    } else {
      this.data = new Uint8Array(data);
    }
  }

  // returns null if no override
  getOverrideContents(): Uint8Array | null {
    if (this.status === Extracted.NOT) {
      return null;
    }
    const buf = this.getContents();
    // Note: BLZ re-compression would happen here if decompressed_data is true.
    // BLZ compression is not yet ported.
    if (this.decompressed_data) {
      // Would BLZ-encode and update compressed_size
      this.compressed_size = buf.length;
    }
    return buf;
  }
}
