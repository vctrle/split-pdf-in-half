import fitz  # PyMuPDF
from PIL import Image
import os

def render_page_as_image(pdf_path, page_number, rotation_angle, dpi=200):
    # Open the PDF
    pdf_document = fitz.open(pdf_path)
    
    # Load the page
    page = pdf_document.load_page(page_number)
    
    # Set the transformation matrix for higher DPI (scale)
    zoom_x = dpi / 72  # Horizontal zoom
    zoom_y = dpi / 72  # Vertical zoom
    mat = fitz.Matrix(zoom_x, zoom_y)
    
    # Render the page as a pixmap (image with higher resolution)
    pix = page.get_pixmap(matrix=mat)
    
    # Convert pixmap to PIL Image for manipulation
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    
    # Rotate the image
    rotated_img = img.rotate(rotation_angle, expand=True)
    
    # Close the PDF document
    pdf_document.close()
    
    return rotated_img

def split_image(image, split_with_overlap=False):
    """Split the image either 50-50 or with 55% overlap based on user input."""
    width, height = image.size
    
    if split_with_overlap:
        left_split_end = int(width * 0.55)  # 55% from the left side
        right_split_start = int(width * 0.45)  # Start 45% into the page for the right side, creating a 10% overlap
    else:
        left_split_end = width // 2  # 50% for the left side
        right_split_start = width // 2  # Start halfway
    
    # Left half contains 55% (or 50%) of the page
    left_half = image.crop((0, 0, left_split_end, height))
    
    # Right half contains 55% (or 50%), starting either halfway or with overlap
    right_half = image.crop((right_split_start, 0, width, height))
    
    return left_half, right_half

def create_compressed_pdf(image_list, output_pdf_path):
    # Compress and save the images as a PDF
    pdf_images = [img.convert('RGB') for img in image_list]

    # Save with compression (JPEG quality at 85 and optimize enabled)
    pdf_images[0].save(output_pdf_path, save_all=True, append_images=pdf_images[1:], quality=85, optimize=True)
    
    print(f"New rotated and split PDF created at: {output_pdf_path}")

def rebuild_rotated_split_pdf(input_pdf_path, rotation_angle, split_with_overlap=False, dpi=200):
    # Open the original PDF
    pdf_document = fitz.open(input_pdf_path)
    
    # Create a list to store the rotated and split images
    processed_images = []
    
    # Iterate over each page, render it as an image, rotate, split, and store the result
    for page_number in range(pdf_document.page_count):
        # Step 1: Render and rotate the page image
        rotated_img = render_page_as_image(input_pdf_path, page_number, rotation_angle, dpi)
        
        # Step 2: Split the rotated image into two halves (with or without overlap)
        left_half, right_half = split_image(rotated_img, split_with_overlap)
        
        # Step 3: Add both halves to the final image list (as separate pages)
        processed_images.append(left_half)
        processed_images.append(right_half)
    
    # Get output path for the new rotated and split PDF
    base_dir = os.path.dirname(input_pdf_path)
    file_name = os.path.basename(input_pdf_path)
    name_without_ext, ext = os.path.splitext(file_name)
    output_pdf_path = os.path.join(base_dir, f"{name_without_ext}_rotated_split_compressed{ext}")
    
    # Create a new compressed PDF from the rotated and split images
    create_compressed_pdf(processed_images, output_pdf_path)
    
    pdf_document.close()

# Main function to get user input and run the rebuild process
def main():
    # Ask the user for the PDF file path
    input_pdf = input("Enter path/filename.pdf: ")
    
    # Check if the file exists
    if not os.path.exists(input_pdf):
        print("The specified file does not exist. Please try again.")
        return
    
    # Ask the user for the rotation angle
    try:
        rotation_angle = int(input("Enter rotation angle (0, 90, 180, 270): "))
        if rotation_angle not in [0, 90, 180, 270]:
            raise ValueError("Invalid rotation angle.")
    except ValueError as e:
        print(f"Error: {e}. Please enter a valid rotation angle.")
        return
    
    # Ask the user if they want to apply the 55% overlap
    split_with_overlap = input("Apply 5% overlap over the middle? (yes/no): ").strip().lower()
    if split_with_overlap == 'yes':
        split_with_overlap = True
    else:
        split_with_overlap = False
    
    # Rebuild the PDF with the rotated and split images, applying overlap if chosen
    rebuild_rotated_split_pdf(input_pdf, rotation_angle, split_with_overlap)

if __name__ == "__main__":
    main()
