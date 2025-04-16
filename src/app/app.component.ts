import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import QRCode from 'qrcode';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'qrGeneratorLord';

  // Control de tamaño del QR
  qrSize = signal<number>(450); // Valor inicial (450px)
  readonly minSize = 180; // Tamaño mínimo
  readonly maxSize = 800; // Tamaño máximo

  // Datos del QR
  url = '';
  qrImage = signal<SafeUrl | string>('');
  qrImageBlobUrl = signal<string>('');
  logoFile: File | null = null;
  qrColor = '#E858F4';
  backgroundColor = '#FFFFFF';
  loading = signal(false);
  error = signal('');

  constructor(private sanitizer: DomSanitizer) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.logoFile = input.files[0];
    }
  }

  // async generateQR(): Promise<void> {
  //   if (!this.url) {
  //     this.error.set('Por favor ingresa una URL');
  //     return;
  //   }

  //   this.loading.set(true);
  //   this.error.set('');

  //   try {
  //     // Liberar URL anterior si existe
  //     if (this.qrImageBlobUrl()) {
  //       URL.revokeObjectURL(this.qrImageBlobUrl());
  //     }

  //     // const QRCode = await import('qrcode');

  //     const canvas = document.createElement('canvas');

  //     // Usar el tamaño seleccionado
  //     canvas.width = this.qrSize();
  //     canvas.height = this.qrSize();

  //     // Opciones para el QR
  //     const qrOptions = {
  //       errorCorrectionLevel: 'H' as const,
  //       margin: this.calculateMargin(), // Margen dinámico
  //       width: this.qrSize(),
  //       color: {
  //         dark: this.qrColor,
  //         light: this.backgroundColor,
  //       },
  //     };

  //     // Generar QR
  //     await QRCode.toCanvas(canvas, this.url, qrOptions);

  //     // Agregar logo si existe
  //     if (this.logoFile) {
  //       await this.addLogoToQR(canvas);
  //     }

  //     // Convertir a Blob
  //     return new Promise<void>((resolve) => {
  //       canvas.toBlob(
  //         (blob) => {
  //           if (blob) {
  //             const blobUrl = URL.createObjectURL(blob);
  //             this.qrImageBlobUrl.set(blobUrl);
  //             this.qrImage.set(this.sanitizer.bypassSecurityTrustUrl(blobUrl));
  //             resolve();
  //           } else {
  //             this.error.set('Error al generar el QR');
  //             resolve();
  //           }
  //         },
  //         'image/png',
  //         1 // Calidad máxima
  //       );
  //     });
  //   } catch (err) {
  //     this.error.set('Error al generar el QR: ' + (err as Error).message);
  //     console.error(err);
  //   } finally {
  //     this.loading.set(false);
  //   }
  // }
  async generateQR(): Promise<void> {
    if (!this.url) {
      this.error.set('Por favor ingresa una URL');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      // Liberar URL anterior si existe
      if (this.qrImageBlobUrl()) {
        URL.revokeObjectURL(this.qrImageBlobUrl());
      }

      const canvas = document.createElement('canvas');
      canvas.width = this.qrSize();
      canvas.height = this.qrSize();

      // Opciones del QR
      const qrOptions = {
        errorCorrectionLevel: 'H' as const,
        margin: this.calculateMargin(),
        width: this.qrSize(),
        color: {
          dark: this.qrColor,
          light: this.backgroundColor,
        },
      };

      // Generar QR (usa QRCode directamente, sin await import)
      await QRCode.toCanvas(canvas, this.url, qrOptions); // ✅

      // Agregar logo si existe
      if (this.logoFile) {
        await this.addLogoToQR(canvas);
      }

      // Convertir a Blob y actualizar señales
      return new Promise<void>((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const blobUrl = URL.createObjectURL(blob);
              this.qrImageBlobUrl.set(blobUrl);
              this.qrImage.set(this.sanitizer.bypassSecurityTrustUrl(blobUrl));
              resolve();
            } else {
              this.error.set('Error al generar el QR');
              resolve();
            }
          },
          'image/png',
          1
        );
      });
    } catch (err) {
      this.error.set('Error al generar el QR: ' + (err as Error).message);
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  private calculateMargin(): number {
    // Margen proporcional al tamaño del QR
    if (this.qrSize() <= 300) return 1;
    if (this.qrSize() <= 500) return 2;
    return 3;
  }

  private async addLogoToQR(canvas: HTMLCanvasElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo obtener el contexto del canvas'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        // Tamaño del logo (15% del tamaño del QR)
        const logoSize = canvas.width * 0.3;
        const x = (canvas.width - logoSize) / 2;
        const y = (canvas.height - logoSize) / 2;

        // Fondo circular para el logo
        ctx.beginPath();
        ctx.arc(
          x + logoSize / 2,
          y + logoSize / 2,
          logoSize / 2,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = this.backgroundColor;
        ctx.fill();

        // Configuración de calidad para el logo
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, x, y, logoSize, logoSize);
        resolve();
      };

      img.onerror = () => {
        reject(new Error('Error al cargar el logo'));
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(this.logoFile!);
    });
  }

  downloadQR(): void {
    if (!this.qrImageBlobUrl()) return;

    const link = document.createElement('a');
    link.href = this.qrImageBlobUrl();
    link.download = `qr-${this.qrSize()}x${this.qrSize()}-${new Date().getTime()}.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
