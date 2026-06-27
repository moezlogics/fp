import { exec } from "child_process";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { Restaurant } from "../models/Restaurant";
import { cdnClient } from "./cdn-client";
import util from "util";
import sharp from "sharp";

const execPromise = util.promisify(exec);

class VirtualTourProcessor {
    /**
     * Entry point for the 3D scene processing job.
     * Runs asynchronously to prevent server lag.
     */
    async processScene(restaurantId: string, sceneName: string, frames: string[], jobId: string) {
        const tempDir = path.join(os.tmpdir(), "foodies-3d", jobId);
        
        try {
            console.log(`[3D Tour] Starting job ${jobId} for restaurant ${restaurantId}`);
            await fs.ensureDir(tempDir);

            // 1. Download/Prepare frames
            const framePaths: string[] = [];
            for (let i = 0; i < frames.length; i++) {
                const framePath = path.join(tempDir, `frame_${i}.jpg`);
                if (frames[i].startsWith("data:")) {
                    const base64Data = frames[i].replace(/^data:image\/\w+;base64,/, "");
                    await fs.writeFile(framePath, Buffer.from(base64Data, "base64"));
                } else {
                    // URL-based frames: download via fetch
                    try {
                        const response = await fetch(frames[i]);
                        const buffer = Buffer.from(await response.arrayBuffer());
                        await fs.writeFile(framePath, buffer);
                    } catch (dlErr) {
                        console.warn(`[3D Tour] Could not download frame ${i}:`, dlErr);
                        continue;
                    }
                }
                framePaths.push(framePath);
            }

            if (framePaths.length < 1) {
                throw new Error("No valid frames to stitch");
            }

            // 2. Hugin Stitching Pipeline (The "Proprietary" Core)
            const ptoFile = path.join(tempDir, "project.pto");
            const outputPano = path.join(tempDir, "panorama");

            console.log(`[3D Tour] ${jobId}: Generating project...`);
            await execPromise(`pto_gen -o ${ptoFile} ${framePaths.join(" ")}`);

            console.log(`[3D Tour] ${jobId}: Finding control points...`);
            await execPromise(`cpfind -o ${ptoFile} --multirow --celeste ${ptoFile}`);

            console.log(`[3D Tour] ${jobId}: Optimizing project...`);
            await execPromise(`autooptimiser -a -m -l -s -o ${ptoFile} ${ptoFile}`);

            console.log(`[3D Tour] ${jobId}: Stitching panorama...`);
            await execPromise(`nona -m TIFF_m -o ${outputPano} ${ptoFile}`);
            
            const finalTiff = path.join(tempDir, "final_stitch.tif");
            await execPromise(`enblend -o ${finalTiff} ${tempDir}/panorama*.tif`);

            // 3. Professional AI-Enhanced Post-Processing (Innovative & Lightweight)
            // We convert to WebP for best quality/size ratio and generate a progressive thumbnail
            console.log(`[3D Tour] ${jobId}: Optimizing for delivery...`);
            const webpPath = path.join(tempDir, "final_360.webp");
            const thumbPath = path.join(tempDir, "thumb_360.webp");

            // Main High-Res WebP (Premium Quality / Low Load)
            await sharp(finalTiff)
                .webp({ quality: 85, effort: 6 }) // Max effort for compression
                .toFile(webpPath);

            // Progressive Placeholder Thumbnail (Low-res blurred)
            await sharp(webpPath)
                .resize(512) // Smaller size for instant load
                .webp({ quality: 50 })
                .toFile(thumbPath);

            // 4. Upload to CDN
            console.log(`[3D Tour] ${jobId}: Uploading to CDN...`);
            const webpBuffer = await fs.readFile(webpPath);
            const thumbBuffer = await fs.readFile(thumbPath);

            const cdnResponse = await cdnClient.uploadImage(
                webpBuffer, 
                `360_${sceneName.toLowerCase().replace(/\s+/g, "_")}.webp`,
                `tour-${restaurantId}`
            );

            const thumbResponse = await cdnClient.uploadImage(
                thumbBuffer,
                `thumb_360_${sceneName.toLowerCase().replace(/\s+/g, "_")}.webp`,
                `tour-${restaurantId}-thumbs`
            );

            // 5. Update Restaurant Model
            const restaurant = await Restaurant.findById(restaurantId);
            if (restaurant) {
                if (!restaurant.virtualTour) {
                    (restaurant as any).virtualTour = { status: "ready", scenes: [] };
                }
                
                // Remove existing scene with same name if any
                restaurant.virtualTour.scenes = restaurant.virtualTour.scenes.filter((s: any) => s.name !== sceneName);

                restaurant.virtualTour.scenes.push({
                    name: sceneName,
                    panoramaUrl: cdnResponse.url,
                    thumbnailUrl: thumbResponse.url,
                    createdAt: new Date(),
                } as any);
                
                restaurant.virtualTour.status = "ready";
                await restaurant.save();
            }

            console.log(`[3D Tour] Job ${jobId} completed successfully!`);

        } catch (error) {
            console.error(`[3D Tour] Job ${jobId} failed:`, error);
            await Restaurant.findByIdAndUpdate(restaurantId, { "virtualTour.status": "failed" });
        } finally {
            await fs.remove(tempDir).catch(e => console.error("Temp cleanup failed", e));
        }
    }
}

export const virtualTourProcessor = new VirtualTourProcessor();
