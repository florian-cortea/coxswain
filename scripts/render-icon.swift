// Resample Composer's rendered PNG with transparent Dock padding; never redraw its materials or mask.
// swift scripts/render-icon.swift input.png output.png [output.iconset] [inset-at-1024]
import AppKit
let a = CommandLine.arguments
guard (3...5).contains(a.count) else {
    fatalError("usage: render-icon.swift input.png output.png [output.iconset] [inset-at-1024]")
}
guard let img = NSImage(contentsOfFile: a[1]) else { fatalError("can't read image") }
let inset = a.count == 5 ? Double(a[4]) : 0
guard let inset, inset >= 0 && inset < 512 else { fatalError("invalid inset") }

func render(_ size: Int, to path: String) throws {
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
        isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
    ), let context = NSGraphicsContext(bitmapImageRep: rep) else {
        fatalError("can't create bitmap")
    }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.imageInterpolation = .high
    let padding = Double(size) * inset / 1024
    img.draw(in: NSRect(x: padding, y: padding, width: Double(size) - 2 * padding, height: Double(size) - 2 * padding))
    NSGraphicsContext.restoreGraphicsState()
    guard let png = rep.representation(using: .png, properties: [:]) else {
        fatalError("can't encode PNG")
    }
    try png.write(to: URL(fileURLWithPath: path))
}

try render(1024, to: a[2])
if a.count >= 4 {
    try FileManager.default.createDirectory(atPath: a[3], withIntermediateDirectories: true)
    for size in [16, 32, 128, 256, 512] {
        try render(size, to: "\(a[3])/icon_\(size)x\(size).png")
        try render(size * 2, to: "\(a[3])/icon_\(size)x\(size)@2x.png")
    }
}
