// File: index.js atau server.js

const WebSocket = require('ws');
const fs = require('fs');

// Port yang didengarkan oleh server. Railway akan menyediakan variabel PORT ini secara otomatis.
const port = process.env.PORT || 8080;

// Inisialisasi WebSocket Server
const wss = new WebSocket.Server({ port });

console.log(`WebSocket Server berjalan di port ${port}`);

// Array untuk melacak semua klien browser yang terhubung
const browserClients = new Set();
// Variabel untuk melacak klien kamera (hanya boleh ada 1)
let cameraClient = null;

wss.on('connection', function connection(ws, req) {
    const isCamera = req.url === '/camera'; // ESP32-CAM akan terhubung melalui path ini

    if (isCamera) {
        // Jika koneksi dari ESP32-CAM
        if (cameraClient) {
            console.log('Koneksi kamera baru ditolak. Satu kamera sudah terhubung.');
            ws.close();
            return;
        }
        cameraClient = ws;
        console.log('Kamera ESP32 berhasil terhubung.');
        
        // Tambahkan browserClients ke set jika belum ada
        browserClients.add(ws); // Biarkan kamera juga ada di set klien browser, jika diperlukan untuk tujuan debugging

    } else {
        // Jika koneksi dari Browser
        browserClients.add(ws);
        console.log('Klien browser baru terhubung. Total klien:', browserClients.size);
    }

    ws.on('message', function incoming(message) {
        if (isCamera) {
            // Jika pesan datang dari kamera (frame gambar biner)
            if (message instanceof Buffer || message instanceof ArrayBuffer) {
                // Teruskan (relay) frame ini ke semua klien browser, kecuali kamera itu sendiri
                browserClients.forEach(client => {
                    if (client !== cameraClient && client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                });
            }
        }
    });

    ws.on('close', function close() {
        if (isCamera) {
            cameraClient = null;
            console.log('Koneksi kamera terputus.');
        } else {
            browserClients.delete(ws);
            console.log('Klien browser terputus. Sisa klien:', browserClients.size);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket Error:', error);
    });
});
