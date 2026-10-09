import CoreImage
import Foundation
import Vision

func fail(_ message: String) -> Never {
    FileHandle.standardError.write("\(message)\n".data(using: .utf8)!)
    exit(1)
}

let args = CommandLine.arguments
guard args.count == 5, let hintX = Double(args[4]) else {
    fail("usage: cut-portrait <in> <out.png> <out.json> <faceHintX 0-1>")
}

guard let source = CIImage(contentsOf: URL(fileURLWithPath: args[1]), options: [.applyOrientationProperty: true]) else {
    fail("cannot read \(args[1])")
}
let width = source.extent.width
let height = source.extent.height
let handler = VNImageRequestHandler(ciImage: source)

let faceRequest = VNDetectFaceLandmarksRequest()
let maskRequest = VNGeneratePersonInstanceMaskRequest()
do {
    try handler.perform([faceRequest, maskRequest])
} catch {
    fail("vision request failed: \(error)")
}

guard let faces = faceRequest.results, !faces.isEmpty else { fail("no face found") }
let face = faces.min { abs($0.boundingBox.midX - hintX) < abs($1.boundingBox.midX - hintX) }!
guard let result = maskRequest.results?.first else { fail("no subject found") }
if result.allInstances.count > 1 {
    FileHandle.standardError.write("note: \(result.allInstances.count) people found, keeping the one nearest faceHintX\n".data(using: .utf8)!)
}

let labels = result.instanceMask
CVPixelBufferLockBaseAddress(labels, .readOnly)
let maskWidth = CVPixelBufferGetWidth(labels)
let maskHeight = CVPixelBufferGetHeight(labels)
let rowBytes = CVPixelBufferGetBytesPerRow(labels)
guard let address = CVPixelBufferGetBaseAddress(labels) else { fail("cannot read instance mask") }
let base = address.assumingMemoryBound(to: UInt8.self)
let px = min(maskWidth - 1, Int(face.boundingBox.midX * Double(maskWidth)))
let py = min(maskHeight - 1, Int((1 - face.boundingBox.midY) * Double(maskHeight)))
let label = Int(base[py * rowBytes + px])
CVPixelBufferUnlockBaseAddress(labels, .readOnly)
guard label != 0 else { fail("face centre is not on a subject") }

guard let sRGB = CGColorSpace(name: CGColorSpace.sRGB) else { fail("sRGB colour space unavailable") }
do {
    let masked = try result.generateMaskedImage(
        ofInstances: IndexSet(integer: label),
        from: handler,
        croppedToInstancesExtent: false
    )
    try CIContext().writePNGRepresentation(
        of: CIImage(cvPixelBuffer: masked),
        to: URL(fileURLWithPath: args[2]),
        format: .RGBA8,
        colorSpace: sRGB
    )
} catch {
    fail("cannot write cutout: \(error)")
}

let box = face.boundingBox
guard let landmarks = face.landmarks,
      let leftEye = landmarks.leftPupil ?? landmarks.leftEye,
      let rightEye = landmarks.rightPupil ?? landmarks.rightEye,
      let contour = landmarks.faceContour else { fail("face landmarks not found") }
func imagePoints(_ region: VNFaceLandmarkRegion2D) -> [CGPoint] {
    region.pointsInImage(imageSize: CGSize(width: width, height: height)).map { CGPoint(x: $0.x, y: height - $0.y) }
}
let eyePoints = imagePoints(leftEye) + imagePoints(rightEye)
let eyeY = eyePoints.map(\.y).reduce(0, +) / Double(eyePoints.count)
guard let chinY = imagePoints(contour).map(\.y).max() else { fail("face contour is empty") }
let json: [String: Double] = [
    "imageWidth": width,
    "imageHeight": height,
    "faceX": box.minX * width,
    "faceY": (1 - box.maxY) * height,
    "faceWidth": box.width * width,
    "faceHeight": box.height * height,
    "eyeY": eyeY,
    "chinY": chinY,
]
do {
    try JSONSerialization.data(withJSONObject: json, options: [.sortedKeys]).write(to: URL(fileURLWithPath: args[3]))
} catch {
    fail("cannot write face JSON: \(error)")
}
