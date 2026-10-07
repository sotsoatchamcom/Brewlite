import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const imageUploadOptions: MulterOptions = {
  // 1. Cấu hình nơi lưu trữ và đổi tên file
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      // Tạo tên file độc nhất để không bị trùng lặp: timestamp-randomId.đuôi_file
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),

  // 2. Bộ lọc (Chỉ cho phép upload file ảnh, chống hacker upload script php/sh)
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          `Định dạng file không hợp lệ. Chỉ chấp nhận các file ảnh (jpg, jpeg, png, gif, webp).`,
        ),
        false,
      );
    }
  },

  // 3. Giới hạn dung lượng (Chống DDoS đầy ổ cứng)
  limits: {
    fileSize: 5 * 1024 * 1024, // Tối đa 5MB / 1 file
  },
};
