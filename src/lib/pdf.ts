import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PesananWithLapak } from '@/types/database';

export function exportPesananToPDF(
  pesananList: PesananWithLapak[],
  options: {
    title: string;
    subTitle?: string;
    adminName?: string;
    totalOmset?: number;
    totalPapan?: number;
  }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Pabrik
  doc.setDrawColor(220, 38, 38); // Red 600
  doc.setLineWidth(1.5);
  doc.line(14, 10, 196, 10);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38); // Red 600
  doc.text('PABRIK TAHU - SISTEM INFORMASI PEMESANAN', 14, 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(options.title, 14, 25);

  if (options.subTitle) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(options.subTitle, 14, 30);
  }

  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(14, 33, 196, 33);

  // Table Data
  const tableData = pesananList.map((p, idx) => [
    idx + 1,
    p.lapak?.nama_lapak || '-',
    p.tanggal_pesanan,
    p.tanggal_pengiriman,
    `${p.jumlah_papan} papan`,
    `Rp ${Number(p.harga_satuan).toLocaleString('id-ID')}`,
    `Rp ${Number(p.total_harga).toLocaleString('id-ID')}`,
    p.metode_pengiriman === 'ambil_sendiri' ? 'Ambil Sendiri' : 'Diantar',
    p.status_pesanan.toUpperCase(),
  ]);

  autoTable(doc, {
    startY: 37,
    head: [
      [
        'No',
        'Lapak',
        'Tgl Pesan',
        'Tgl Kirim',
        'Jumlah',
        'Harga/Papan',
        'Total',
        'Metode',
        'Status',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [185, 28, 28], // Red 700
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 30 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'right', cellWidth: 25 },
      7: { halign: 'center', cellWidth: 20 },
      8: { halign: 'center', cellWidth: 23 },
    },
    didDrawPage: (data) => {
      // Footer page number
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Halaman ${doc.getNumberOfPages()} - Dicetak pada ${new Date().toLocaleString('id-ID')}`,
        14,
        287
      );
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 100;

  // Ringkasan Total
  if (options.totalOmset !== undefined || options.totalPapan !== undefined) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30);

    const summaryY = finalY + 8;
    if (summaryY < 260) {
      if (options.totalPapan !== undefined) {
        doc.text(`Total Produksi/Papan: ${options.totalPapan} papan`, 14, summaryY);
      }
      if (options.totalOmset !== undefined) {
        doc.text(
          `Total Transaksi Lunas: Rp ${options.totalOmset.toLocaleString('id-ID')}`,
          14,
          summaryY + 5
        );
      }
    }
  }

  // Tanda Tangan
  const signY = finalY + 22;
  if (signY < 260) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50);
    doc.text('Mengetahui / Penanggung Jawab,', 140, signY);
    doc.text('Pengelola Pabrik Tahu', 140, signY + 5);
    doc.line(140, signY + 25, 185, signY + 25);
    doc.text(options.adminName || 'Admin Pabrik', 140, signY + 29);
  }

  doc.save(`Laporan_Pemesanan_Tahu_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportPembayaranToPDF(
  paymentList: {
    no: number;
    tanggalPembayaran: string;
    tanggalPengiriman: string;
    jumlahPapan: number;
    nominal: number;
    metodePembayaran: string;
    status: string;
  }[],
  options: {
    namaLapak: string;
    alamatLapak: string;
    totalNominal: number;
  }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Pabrik
  doc.setDrawColor(220, 38, 38); // Red 600
  doc.setLineWidth(1.5);
  doc.line(14, 10, 196, 10);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('PABRIK TAHU SUMEDANG TEH UCI', 14, 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(`Kuitansi & Riwayat Pembayaran - ${options.namaLapak}`, 14, 25);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Alamat Cabang: ${options.alamatLapak}`, 14, 30);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 33, 196, 33);

  // Table Data
  const tableData = paymentList.map((item) => [
    item.no,
    item.tanggalPembayaran,
    item.tanggalPengiriman,
    `${item.jumlahPapan} papan`,
    `Rp ${Number(item.nominal).toLocaleString('id-ID')}`,
    item.metodePembayaran.toUpperCase(),
    item.status,
  ]);

  autoTable(doc, {
    startY: 37,
    head: [
      ['No', 'Tgl Pembayaran', 'Tgl Kirim', 'Jumlah', 'Nominal Lunas', 'Metode Bayar', 'Status'],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [185, 28, 28],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 32 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'right', cellWidth: 32 },
      5: { halign: 'center', cellWidth: 28 },
      6: { halign: 'center', cellWidth: 32 },
    },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Halaman ${doc.getNumberOfPages()} - Dicetak pada ${new Date().toLocaleString('id-ID')}`,
        14,
        287
      );
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 100;
  const summaryY = finalY + 8;
  if (summaryY < 260) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30);
    doc.text(
      `Total Pembayaran Lunas: Rp ${options.totalNominal.toLocaleString('id-ID')}`,
      14,
      summaryY
    );
  }

  doc.save(
    `Riwayat_Pembayaran_${options.namaLapak.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  );
}
